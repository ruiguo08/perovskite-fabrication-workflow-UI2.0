"""Per-device directional scan stats cache and representative selection.

v7 storage keeps every scan as an individual trace; a device's per-
direction representative is a write-time cache rewritten whenever scans
are (re)assigned to the physical device, and the user's explicit choice
overrides the highest-PCE default. These tests exercise the cache
lifecycle across uploads, the selection override, and the scan-history
API surface.
"""

import asyncio
import sys
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fastapi.testclient import TestClient
from sqlalchemy import func, select, update

from tests.test_fabrication_batches import _create_released_experiment_with_conditions
from web import create_app
from web.database import (
    audit_events,
    device_scan_stats,
    result_files,
)
from web.repository import (
    BatchStatus,
    ExecutionStatus,
    PreparationStatus,
    UserRole,
)

TEST_USERNAME = "device-scans-admin"
TEST_PASSWORD = "correct horse battery staple"


def repeat_scan_csv(
    scans: list[tuple[str, float]],
    *,
    mark: str = "A001",
) -> str:
    """Multi-device export where one device is scanned repeatedly.

    ``scans`` are ``(direction, current_density)`` pairs, scanned in order;
    repeated directions carry ``(n)`` suffixes like the instrument does.
    Curve-recomputed PCE is ``0.5 * current_density``.
    """

    rows: list[list[str]] = [[], [], [], [], []]
    direction_counts: dict[str, int] = {}
    for trace_index, (direction, current) in enumerate(scans, start=1):
        direction_counts[direction] = direction_counts.get(direction, 0) + 1
        suffix = (
            f"({direction_counts[direction]})"
            if direction_counts[direction] > 1
            else ""
        )
        label = f"{mark} Channel 1.{direction.capitalize()}{suffix}"
        rows[0].extend(["No.", str(trace_index), "", "", "", "", ""])
        rows[1].extend(
            ["[Information]", "", "[Volt (V)]", "[Current (mA)]", "[J (mA/cm^2)]", "", ""]
        )
        rows[2].extend(["Name", label, "0", "-2", str(-current), "", ""])
        rows[3].extend(["", "", "0.5", "-2", str(-current), "", ""])
        rows[4].extend(["", "", "1", "0", "0", "", ""])
    return "\n".join(",".join(row) for row in rows) + "\n"


class DeviceScanStatsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.database_path = Path(self.tmp.name) / "device-scans.sqlite3"
        self.app = create_app(
            self.database_path,
            secure_cookies=False,
            _test_user=(TEST_USERNAME, TEST_PASSWORD, UserRole.ADMINISTRATOR),
        )
        self.client_context = TestClient(self.app)
        self.client = self.client_context.__enter__()
        self.repository = self.app.state.repository
        self._login()
        from tests.layout_fixtures import seed_standard_layouts

        seed_standard_layouts(self.client)
        self.experiment_id = asyncio.run(
            _create_released_experiment_with_conditions(
                self.repository, "device-scans"
            )
        )
        self.batch_id = self._completed_batch()

    def tearDown(self) -> None:
        asyncio.run(self.app.state.database.dispose())
        self.client_context.__exit__(None, None, None)
        self.tmp.cleanup()

    def _login(self) -> None:
        token = self.client.get("/api/auth/login-csrf").json()["login_csrf_token"]
        response = self.client.post(
            "/api/auth/login",
            json={
                "username": TEST_USERNAME,
                "password": TEST_PASSWORD,
                "login_csrf": token,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.client.headers["X-CSRF-Token"] = self.client.cookies.get(
            "perovskite_csrf"
        )

    def _completed_batch(self) -> int:
        batch = asyncio.run(
            self.repository.create_fabrication_batch(
                self.experiment_id, actor_user_id=1
            )
        )
        for preparation in asyncio.run(
            self.repository.list_solution_preparations(batch.id)
        ):
            asyncio.run(
                self.repository.update_solution_preparation(
                    preparation.id,
                    status=PreparationStatus.DISCARDED,
                    fabrication_batch_id=batch.id,
                    actor_user_id=1,
                )
            )
        conditions = asyncio.run(
            self.repository.get_fabrication_batch_conditions(batch.id)
        )
        for execution in asyncio.run(
            self.repository.list_process_executions(batch.id)
        ):
            asyncio.run(
                self.repository.update_process_execution(
                    execution.id,
                    status=ExecutionStatus.CANCELLED,
                    fabrication_batch_id=batch.id,
                    actor_user_id=1,
                )
            )
        asyncio.run(
            self.repository.update_fabrication_batch_status(
                batch.id, BatchStatus.READY, actor_user_id=1
            )
        )
        asyncio.run(
            self.repository.update_fabrication_batch_status(
                batch.id, BatchStatus.IN_PROGRESS, actor_user_id=1
            )
        )
        asyncio.run(
            self.repository.update_fabrication_batch_status(
                batch.id,
                BatchStatus.COMPLETED,
                actual_substrate_counts={c.id: 1 for c in conditions},
                shortfall_deviations=[
                    (c.id, "Test setup: one substrate per condition.")
                    for c in conditions
                ],
                actor_user_id=1,
            )
        )
        return batch.id

    def _upload(self, filename: str, content: str) -> int:
        uploaded = self.client.post(
            f"/api/experiments/{self.experiment_id}/results",
            files={"result_file": (filename, content.encode("utf-8"), "text/csv")},
            data={"fabrication_batch_id": str(self.batch_id)},
        )
        self.assertEqual(uploaded.status_code, 201, uploaded.text)
        return int(uploaded.json()["id"])

    def _assign_control(self, file_id: int) -> None:
        detail = self.client.get(f"/api/results/{file_id}").json()
        control_id = next(
            group["batch_condition_id"]
            for group in detail["groups"]
            if group["kind"] == "control"
        )
        assigned = self.client.post(
            f"/api/results/{file_id}/assignments",
            json={
                "assignments": [
                    {
                        "analysis_substrate_id": "A001",
                        "batch_condition_id": control_id,
                    }
                ]
            },
        )
        self.assertEqual(assigned.status_code, 200, assigned.text)

    def _fabrication_device_id(self, file_id: int) -> int:
        rows = self.client.get(f"/api/results/{file_id}/assignments").json()
        device_ids = {row["fabrication_device_id"] for row in rows}
        self.assertEqual(len(device_ids), 1)
        return int(device_ids.pop())

    def _stats_rows(self, device_id: int) -> dict[str, dict]:
        async def _query():
            async with self.repository.database.engine.connect() as connection:
                rows = (
                    await connection.execute(
                        select(device_scan_stats).where(
                            device_scan_stats.c.fabrication_device_id == device_id
                        )
                    )
                ).mappings().all()
            return {str(row["direction"]): dict(row) for row in rows}

        return asyncio.run(_query())

    def test_assignment_writes_cache_with_best_pce_representative(self) -> None:
        # Forward scans with PCE 10 and 12; reverse with PCE 8.
        file_id = self._upload(
            "A001 Channel 1.csv", repeat_scan_csv([("forward", 20.0), ("forward", 24.0), ("reverse", 16.0)])
        )
        self._assign_control(file_id)
        device_id = self._fabrication_device_id(file_id)

        history = self.client.get(
            f"/api/fabrication-devices/{device_id}/jv-scans"
        ).json()

        self.assertEqual(len(history["scans"]), 3)
        self.assertEqual(history["scan_counts"]["forward"], 2)
        self.assertEqual(history["scan_counts"]["reverse"], 1)
        representative = history["representative"]
        # The representative is the highest-PCE valid scan, not the first.
        self.assertEqual(representative["forward"]["trace_id"], "trace-002")
        self.assertAlmostEqual(representative["forward"]["metrics"]["pce"], 12.0)
        self.assertEqual(representative["reverse"]["trace_id"], "trace-003")
        self.assertFalse(representative["forward"]["from_user_selection"])
        stats = self._stats_rows(device_id)
        self.assertEqual(stats["forward"]["best_trace_id"], "trace-002")
        self.assertEqual(stats["forward"]["scan_count"], 2)
        self.assertEqual(stats["reverse"]["best_trace_id"], "trace-003")
        # Every scan keeps its verbatim per-trace metrics and provenance.
        forward_scans = [
            scan for scan in history["scans"] if scan["direction"] == "forward"
        ]
        self.assertEqual(
            {scan["metrics"]["pce"] for scan in forward_scans}, {10.0, 12.0}
        )
        self.assertTrue(all(scan["filename"] for scan in history["scans"]))

    def test_second_upload_accumulates_and_updates_the_cache(self) -> None:
        first = self._upload(
            "A001 Channel 1.csv", repeat_scan_csv([("forward", 20.0), ("reverse", 16.0)])
        )
        self._assign_control(first)
        device_id = self._fabrication_device_id(first)
        # A re-measurement days later arrives as a new CSV upload.
        second = self._upload(
            "A001 Channel 1 rescan.csv", repeat_scan_csv([("forward", 28.0)])
        )
        self._assign_control(second)

        history = self.client.get(
            f"/api/fabrication-devices/{device_id}/jv-scans"
        ).json()

        self.assertEqual(len(history["scans"]), 3)
        self.assertEqual(history["scan_counts"]["forward"], 2)
        # The new upload's scan is the better forward scan, so the cache
        # moved to it without any manual recomputation.
        self.assertEqual(history["representative"]["forward"]["trace_id"], "trace-001")
        self.assertEqual(history["representative"]["forward"]["result_file_id"], second)
        self.assertAlmostEqual(history["representative"]["forward"]["metrics"]["pce"], 14.0)
        stats = self._stats_rows(device_id)
        self.assertEqual(stats["forward"]["best_result_file_id"], second)
        self.assertEqual(stats["forward"]["scan_count"], 2)

    def test_user_selection_overrides_and_clears(self) -> None:
        file_id = self._upload(
            "A001 Channel 1.csv", repeat_scan_csv([("forward", 20.0), ("forward", 24.0)])
        )
        self._assign_control(file_id)
        device_id = self._fabrication_device_id(file_id)

        # The user pins the lower-PCE first scan as the representative.
        chosen = self.client.put(
            f"/api/fabrication-devices/{device_id}/jv-scans/representative",
            json={
                "direction": "forward",
                "result_file_id": file_id,
                "trace_id": "trace-001",
            },
        )
        self.assertEqual(chosen.status_code, 200, chosen.text)
        body = chosen.json()
        self.assertEqual(body["representative"]["forward"]["trace_id"], "trace-001")
        self.assertTrue(body["representative"]["forward"]["from_user_selection"])
        stats = self._stats_rows(device_id)
        self.assertEqual(stats["forward"]["best_trace_id"], "trace-001")

        audit_count = asyncio.run(self._audit_count("device.set_representative_scan"))
        self.assertEqual(audit_count, 1)

        # A scan of another direction (or an unknown trace) is rejected.
        invalid = self.client.put(
            f"/api/fabrication-devices/{device_id}/jv-scans/representative",
            json={
                "direction": "reverse",
                "result_file_id": file_id,
                "trace_id": "trace-001",
            },
        )
        self.assertEqual(invalid.status_code, 422, invalid.text)

        # Clearing the choice falls back to the highest-PCE rule.
        cleared = self.client.delete(
            f"/api/fabrication-devices/{device_id}/jv-scans/representative",
            params={"direction": "forward"},
        )
        self.assertEqual(cleared.status_code, 200, cleared.text)
        body = cleared.json()
        self.assertEqual(body["representative"]["forward"]["trace_id"], "trace-002")
        self.assertFalse(body["representative"]["forward"]["from_user_selection"])
        stats = self._stats_rows(device_id)
        self.assertEqual(stats["forward"]["best_trace_id"], "trace-002")

    def test_unknown_device_returns_404(self) -> None:
        response = self.client.get("/api/fabrication-devices/999999/jv-scans")
        self.assertEqual(response.status_code, 404, response.text)

    def _assert_list_best_metrics(self, pce: float | None, jsc: float | None) -> None:
        for path, entity_id in (
            ("/api/experiments", self.experiment_id),
            ("/api/fabrication-batches", self.batch_id),
        ):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200, response.text)
            row = next(item for item in response.json() if item["id"] == entity_id)
            self.assertEqual(row["best_pce"], pce, path)
            self.assertEqual(row["best_jsc"], jsc, path)

    def _set_excluded(self, file_id: int, excluded: bool) -> None:
        detail = self.client.get(f"/api/results/{file_id}").json()
        control_id = next(
            group["batch_condition_id"]
            for group in detail["groups"] if group["kind"] == "control"
        )
        device_id = detail["analysis"]["devices"][0]["device_id"]
        saved = self.client.post(
            f"/api/results/{file_id}/assignments",
            json={
                "assignments": [{
                    "analysis_substrate_id": "A001",
                    "batch_condition_id": control_id,
                }],
                "exclusions": [{
                    "analysis_device_id": device_id,
                    "reason": "Rejected outlier",
                }] if excluded else [],
                "correction_reason": "Update the measurement exclusion after review",
            },
        )
        self.assertEqual(saved.status_code, 200, saved.text)

    def test_list_best_metrics_ignore_lower_pinned_representative(self) -> None:
        file_id = self._upload(
            "A001 Channel 1.csv",
            repeat_scan_csv([("forward", 20.0), ("forward", 24.0), ("reverse", 80.0)]),
        )
        # Unassigned files do not advertise a measurement on a batch/plan.
        self._assert_list_best_metrics(None, None)
        self._assign_control(file_id)
        self._assert_list_best_metrics(12.0, 24.0)
        device_id = self._fabrication_device_id(file_id)
        chosen = self.client.put(
            f"/api/fabrication-devices/{device_id}/jv-scans/representative",
            json={"direction": "forward", "result_file_id": file_id, "trace_id": "trace-001"},
        )
        self.assertEqual(chosen.status_code, 200, chosen.text)
        # The scan-history representative remains the user's 10% choice.
        self.assertEqual(chosen.json()["representative"]["forward"]["metrics"]["pce"], 10.0)
        self.assertEqual(self._stats_rows(device_id)["forward"]["best_metrics"]["pce"], 10.0)
        self._assert_list_best_metrics(12.0, 24.0)

    def test_list_best_metrics_respect_exclusions_per_result_file(self) -> None:
        best = self._upload("best.csv", repeat_scan_csv([("forward", 24.0)]))
        self._assign_control(best)
        rescan = self._upload("rescan.csv", repeat_scan_csv([("forward", 20.0)]))
        self._assign_control(rescan)
        self._assert_list_best_metrics(12.0, 24.0)

        self._set_excluded(best, True)
        # Excluding one file's device leaves its other uploaded scans eligible.
        self._assert_list_best_metrics(10.0, 20.0)
        self._set_excluded(rescan, True)
        self._assert_list_best_metrics(None, None)
        self._set_excluded(best, False)
        self._assert_list_best_metrics(12.0, 24.0)

    def test_list_best_metrics_validate_forward_metrics_and_keep_first_tie(self) -> None:
        file_id = self._upload("valid.csv", repeat_scan_csv([("forward", 24.0)]))
        self._assign_control(file_id)
        analysis = deepcopy(self.client.get(f"/api/results/{file_id}").json()["analysis"])
        device = analysis["devices"][0]
        template = device["traces"][0]
        for index, (valid, direction, metrics) in enumerate([
            (False, "forward", {"pce": 100.0, "jsc": 100.0}),
            (True, "reverse", {"pce": 100.0, "jsc": 100.0}),
            (True, "forward", {"pce": 100.0}),
            (True, "forward", {"pce": float("nan"), "jsc": 100.0}),
            (True, "forward", {"pce": 100.0, "jsc": float("inf")}),
            (True, "forward", {"pce": True, "jsc": 100.0}),
            (True, "forward", {"pce": 12.0, "jsc": 200.0}),
        ]):
            device["traces"].append({
                **template, "trace_id": f"boundary-{index}", "valid": valid,
                "direction": direction, "metrics": metrics,
            })
        # Simulate malformed legacy metrics at the persisted JSON boundary;
        # upload parsing itself already rejects invalid new measurements.
        async def save() -> None:
            async with self.repository.database.begin() as connection:
                await connection.execute(
                    update(result_files).where(result_files.c.id == file_id).values(analysis=analysis)
                )
        asyncio.run(save())
        self._assert_list_best_metrics(12.0, 24.0)

    def test_experiment_maximum_spans_batches_without_mixing_batch_metrics(self) -> None:
        first_batch_id = self.batch_id
        best = self._upload("first-batch.csv", repeat_scan_csv([("forward", 24.0)]))
        self._assign_control(best)
        self.batch_id = self._completed_batch()
        rescan = self._upload("second-batch.csv", repeat_scan_csv([("forward", 20.0)]))
        self._assign_control(rescan)
        experiment = next(
            row for row in self.client.get("/api/experiments").json()
            if row["id"] == self.experiment_id
        )
        batches = {row["id"]: row for row in self.client.get("/api/fabrication-batches").json()}
        self.assertEqual(experiment["best_pce"], 12.0)
        self.assertEqual(batches[first_batch_id]["best_pce"], 12.0)
        self.assertEqual(batches[self.batch_id]["best_pce"], 10.0)
        self._set_excluded(best, True)
        self._assert_list_best_metrics(10.0, 20.0)
        first_batch = next(
            row for row in self.client.get("/api/fabrication-batches").json()
            if row["id"] == first_batch_id
        )
        self.assertIsNone(first_batch["best_pce"])

    def test_list_metrics_do_not_expose_another_owners_measurement(self) -> None:
        file_id = self._upload("private.csv", repeat_scan_csv([("forward", 24.0)]))
        self._assign_control(file_id)
        self._assert_list_best_metrics(12.0, 24.0)
        username, password = "metrics-peer", "metrics peer password 2026"
        created = self.client.post("/api/users", json={
            "username": username, "display_name": "Metrics peer",
            "password": password, "role": "student",
        })
        self.assertEqual(created.status_code, 201, created.text)
        self.assertEqual(self.client.post("/api/auth/logout").status_code, 204)
        token = self.client.get("/api/auth/login-csrf").json()["login_csrf_token"]
        logged_in = self.client.post("/api/auth/login", json={
            "username": username, "password": password, "login_csrf": token,
        })
        self.assertEqual(logged_in.status_code, 200, logged_in.text)
        for path in ("/api/experiments", "/api/fabrication-batches"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json(), [])

    async def _audit_count(self, action: str) -> int:
        async with self.repository.database.engine.connect() as connection:
            return int(
                await connection.scalar(
                    select(func.count())
                    .select_from(audit_events)
                    .where(audit_events.c.action == action)
                )
                or 0
            )


if __name__ == "__main__":
    unittest.main()
