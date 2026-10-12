"""Read-only campaign analysis API: scoping, semantics, and contract tests.

Covers the campaign-analysis foundation (A1): cross-upload physical-device
deduplication with forward/reverse separation, latest/mean representative
rules with upload-time tie-breaks, actual/planned/mixed process variants,
exclusion and legacy-schema diagnostics, student isolation with the fixed
404 semantics, and the content digest contract (deterministic re-extraction,
sensitivity to sources and selection rules, no generation-time input).
"""

from __future__ import annotations

import asyncio
import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from fastapi.testclient import TestClient

from tests.test_fabrication_batches import _create_released_experiment_with_conditions
from tests.test_jv_parser import instrument_named_csv, multi_device_csv
from web import create_app
from web.repository import (
    BatchStatus,
    ExecutionStatus,
    PreparationStatus,
    UserRole,
)

ADMIN_USERNAME = "campaign-analysis-admin"
ADMIN_PASSWORD = "campaign analysis administrator password"
STUDENT_USERNAME = "campaign-analysis-student"
STUDENT_PASSWORD = "campaign analysis student password"
OTHER_USERNAME = "campaign-analysis-other"
OTHER_PASSWORD = "campaign analysis other password"

CAMPAIGN = "campaign-analysis"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class CampaignAnalysisApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.database_path = Path(self.tmp.name) / "campaign-analysis.sqlite3"
        self.app = create_app(
            self.database_path,
            secure_cookies=False,
            _test_user=(ADMIN_USERNAME, ADMIN_PASSWORD, UserRole.ADMINISTRATOR),
        )
        self.client_context = TestClient(self.app)
        self.client = self.client_context.__enter__()
        self.repository = self.app.state.repository
        self._login_as(ADMIN_USERNAME, ADMIN_PASSWORD)
        from tests.layout_fixtures import seed_standard_layouts

        seed_standard_layouts(self.client)
        self.experiment_id = asyncio.run(
            _create_released_experiment_with_conditions(self.repository, CAMPAIGN)
        )

    def tearDown(self) -> None:
        asyncio.run(self.app.state.database.dispose())
        self.client_context.__exit__(None, None, None)
        self.tmp.cleanup()

    def _login_as(self, username: str, password: str) -> None:
        self.client.cookies.clear()
        self.client.headers.pop("X-CSRF-Token", None)
        token = self.client.get("/api/auth/login-csrf").json()["login_csrf_token"]
        response = self.client.post(
            "/api/auth/login",
            json={"username": username, "password": password, "login_csrf": token},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.client.headers["X-CSRF-Token"] = self.client.cookies.get(
            "perovskite_csrf"
        )

    def _create_student(self, username: str, password: str) -> int:
        response = self.client.post(
            "/api/users",
            json={
                "username": username,
                "display_name": username.replace("-", " ").title(),
                "password": password,
                "role": UserRole.STUDENT.value,
            },
        )
        self.assertIn(response.status_code, (200, 201), response.text)
        listing = self.client.get("/api/users")
        self.assertEqual(listing.status_code, 200, listing.text)
        return next(
            int(row["id"]) for row in listing.json() if row["username"] == username
        )

    def _completed_batch(
        self, experiment_id: int, substrates_per_condition: int = 1
    ) -> int:
        batch = asyncio.run(
            self.repository.create_fabrication_batch(
                experiment_id, actor_user_id=1
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
        conditions = asyncio.run(
            self.repository.get_fabrication_batch_conditions(batch.id)
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
                actual_substrate_counts={
                    condition.id: substrates_per_condition for condition in conditions
                },
                shortfall_deviations=[
                    (condition.id, "Test setup: fewer measured substrates.")
                    for condition in conditions
                ],
                actor_user_id=1,
            )
        )
        return batch.id

    def _upload(
        self,
        experiment_id: int,
        batch_id: int,
        csv_text: str,
        filename: str = "A001 Channel 1.csv",
    ) -> int:
        uploaded = self.client.post(
            f"/api/experiments/{experiment_id}/results",
            files={"result_file": (filename, csv_text.encode("utf-8"), "text/csv")},
            data={"fabrication_batch_id": str(batch_id)},
        )
        self.assertEqual(uploaded.status_code, 201, uploaded.text)
        return int(uploaded.json()["id"])

    def _assign(
        self,
        file_id: int,
        mapping: dict[str, int],
        *,
        exclusions: list[dict[str, str]] | None = None,
    ) -> None:
        payload = {
            "assignments": [
                {
                    "analysis_substrate_id": substrate_id,
                    "batch_condition_id": condition_id,
                }
                for substrate_id, condition_id in mapping.items()
            ]
        }
        if exclusions:
            payload["exclusions"] = exclusions
        response = self.client.post(f"/api/results/{file_id}/assignments", json=payload)
        self.assertEqual(response.status_code, 200, response.text)

    def _condition_ids(self, batch_id: int) -> dict[str, int]:
        conditions = asyncio.run(
            self.repository.get_fabrication_batch_conditions(batch_id)
        )
        return {condition.role: condition.id for condition in conditions}

    def _analysis(
        self,
        campaign: str = CAMPAIGN,
        *,
        representative: str = "latest",
        batch_id: int | None = None,
    ) -> dict:
        query = f"representative={representative}"
        if batch_id is not None:
            query += f"&fabrication_batch_id={batch_id}"
        response = self.client.get(f"/api/campaigns/{campaign}/analysis?{query}")
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    # ------------------------------------------------------------------
    # Deduplication and direction separation
    # ------------------------------------------------------------------

    def test_cross_upload_dedup_and_direction_separation(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        first = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(first, {"A001": conditions["control"]})
        second = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-30.0, -28.0])
        )
        self._assign(second, {"A001": conditions["control"]})

        payload = self._analysis()

        self.assertEqual(payload["campaign"]["code"], CAMPAIGN)
        self.assertEqual(payload["scope"]["representative"], "latest")
        self.assertEqual(payload["experiment_count"], 1)
        # Two uploads x two directions = four raw measurement entries.
        self.assertEqual(len(payload["measurements"]), 4)
        directions = sorted(
            entry["direction"] for entry in payload["measurements"]
        )
        self.assertEqual(directions, ["forward", "forward", "reverse", "reverse"])
        representatives = [
            entry for entry in payload["measurements"] if entry["representative"]
        ]
        self.assertEqual(len(representatives), 2)
        forward = next(
            entry for entry in representatives if entry["direction"] == "forward"
        )
        # latest keeps the most recent upload, not the best measurement.
        self.assertEqual(forward["result_file_id"], second)
        self.assertEqual(forward["measurement_count"], 2)
        self.assertEqual(forward["source_result_file_ids"], sorted([first, second]))
        # Forward and reverse stay separate everywhere.
        self.assertEqual(len(payload["summaries"]), 2)
        forward_summary = next(
            row for row in payload["summaries"] if row["direction"] == "forward"
        )
        self.assertEqual(forward_summary["device_count"], 1)
        self.assertEqual(forward_summary["substrate_count"], 1)
        self.assertEqual(forward_summary["measurement_count"], 2)
        # current -30 mA -> pce 15 (0.5 per mA/cm2 under the fixture geometry).
        self.assertAlmostEqual(forward_summary["metrics"]["pce"], 15.0)
        self.assertAlmostEqual(forward_summary["pce_best"], 15.0)
        self.assertEqual(forward_summary["representative_rule"], "latest")

    def test_mean_representative_averages_without_fabricated_source(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        first = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(first, {"A001": conditions["control"]})
        second = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-30.0, -28.0])
        )
        self._assign(second, {"A001": conditions["control"]})

        payload = self._analysis(representative="mean")

        representatives = [
            entry for entry in payload["measurements"] if entry["representative"]
        ]
        self.assertEqual(len(representatives), 2)
        forward = next(
            entry for entry in representatives if entry["direction"] == "forward"
        )
        # The mean is synthetic: averaged metrics, no single fabricated source.
        self.assertAlmostEqual(forward["metrics"]["pce"], 12.5)
        self.assertIsNone(forward["result_file_id"])
        self.assertIsNone(forward["trace_id"])
        self.assertIsNone(forward["metric_source"])
        self.assertIsNone(forward["measured_at"])
        self.assertEqual(forward["source_result_file_ids"], sorted([first, second]))
        # Raw entries remain visible and are never marked representative.
        self.assertEqual(len(payload["measurements"]), 6)
        self.assertEqual(
            sum(1 for entry in payload["measurements"] if entry["representative"]),
            2,
        )
        summary = next(
            row for row in payload["summaries"] if row["direction"] == "forward"
        )
        self.assertEqual(summary["representative_rule"], "mean")
        self.assertAlmostEqual(summary["metrics"]["pce"], 12.5)

    def test_same_upload_time_tie_break_keeps_higher_file_id(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        first = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(first, {"A001": conditions["control"]})
        second = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-40.0, -38.0])
        )
        self._assign(second, {"A001": conditions["control"]})
        shared = _utcnow() - timedelta(minutes=5)

        async def _equalize_upload_times() -> None:
            async with self.app.state.database.begin() as connection:
                from web.database import result_files

                for file_id in (first, second):
                    await connection.execute(
                        result_files.update()
                        .where(result_files.c.id == file_id)
                        .values(created_at=shared)
                    )

        asyncio.run(_equalize_upload_times())

        payload = self._analysis()
        forward = next(
            entry
            for entry in payload["measurements"]
            if entry["representative"] and entry["direction"] == "forward"
        )
        self.assertEqual(forward["result_file_id"], second)

    def test_missing_physical_binding_stays_visible_without_counts(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id,
            batch_id,
            instrument_named_csv(["Control-1"], [1]),
            filename="panel-run.csv",
        )
        detail = self.client.get(f"/api/results/{uploaded}").json()
        substrate_id = detail["analysis"]["devices"][0]["substrate_id"]
        self._assign(uploaded, {substrate_id: conditions["control"]})

        payload = self._analysis()

        diagnostic_codes = {row["code"] for row in payload["diagnostics"]}
        self.assertIn("unbound-device", diagnostic_codes)
        entry = payload["measurements"][0]
        self.assertIsNone(entry["fabrication_device_id"])
        self.assertIsNone(entry["fabrication_substrate_id"])
        self.assertFalse(entry["representative"])
        # No deduplicatable device: no summary row is produced.
        self.assertEqual(payload["summaries"], [])
        # Coverage still reports the measured substrate count honestly.
        self.assertEqual(payload["coverage"][0]["measured_substrate_count"], 0)

    def test_excluded_device_is_diagnosed_and_never_counted(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        detail = self.client.get(f"/api/results/{uploaded}").json()
        device_id = detail["analysis"]["devices"][0]["device_id"]
        self._assign(
            uploaded,
            {"A001": conditions["control"]},
            exclusions=[{"analysis_device_id": device_id, "reason": "shunted contacts"}],
        )

        payload = self._analysis()

        excluded = next(
            row
            for row in payload["diagnostics"]
            if row["code"] == "excluded-devices"
        )
        self.assertEqual(excluded["devices"][0]["analysis_device_id"], device_id)
        self.assertEqual(excluded["devices"][0]["reason"], "shunted contacts")
        self.assertEqual(payload["summaries"], [])
        self.assertEqual(
            [entry for entry in payload["measurements"] if entry["representative"]],
            [],
        )

    def test_missing_direction_is_diagnosed_not_zero(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id,
            batch_id,
            # One device, forward scan only.
            multi_device_csv([-20.0]),
        )
        self._assign(uploaded, {"A001": conditions["control"]})

        payload = self._analysis()

        missing = next(
            row for row in payload["diagnostics"] if row["code"] == "missing-direction"
        )
        self.assertEqual(missing["fabrication_device_ids"], [1])
        self.assertIn("reverse", missing["message"])
        self.assertEqual(
            [row["direction"] for row in payload["summaries"]], ["forward"]
        )

    def test_legacy_combined_schema_is_normalized_and_diagnosed(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(uploaded, {"A001": conditions["control"]})

        async def _downgrade_to_legacy_combined() -> None:
            async with self.app.state.database.begin() as connection:
                from web.database import result_files

                row = (
                    await connection.execute(
                        result_files.select().where(result_files.c.id == uploaded)
                    )
                ).mappings().one()
                analysis = dict(row["analysis"])
                device = analysis["devices"][0]
                # A true legacy v5 record: a flat metric record and traces
                # without valid metrics, so the v7 rebuild has nothing to
                # recover and the flat record stays combined.
                device["metrics"] = dict(device["metrics"]["forward"])
                for trace in device["traces"]:
                    trace["valid"] = False
                    trace["metrics"] = None
                analysis["schema_version"] = 6
                await connection.execute(
                    result_files.update()
                    .where(result_files.c.id == uploaded)
                    .values(analysis=analysis, analysis_schema_version=6)
                )

        asyncio.run(_downgrade_to_legacy_combined())

        payload = self._analysis()
        codes = {row["code"] for row in payload["diagnostics"]}
        self.assertIn("legacy-combined-direction", codes)
        directions = [entry["direction"] for entry in payload["measurements"]]
        self.assertEqual(directions, ["combined"])
        self.assertEqual(payload["summaries"], [])

    # ------------------------------------------------------------------
    # Actual process variants
    # ------------------------------------------------------------------

    def test_actual_variant_splits_from_planned_fallback(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(uploaded, {"A001": conditions["control"]})

        async def _record_adjusted_spin() -> None:
            from web.database import process_execution_members, process_executions

            async with self.app.state.database.begin() as connection:
                rows = (
                    (
                        await connection.execute(
                            process_executions.select().where(
                                process_executions.c.fabrication_batch_id == batch_id,
                                process_executions.c.layer_type == "perovskite",
                                process_executions.c.method == "spin_coating",
                            )
                        )
                    )
                    .mappings()
                    .all()
                )
                for row in rows:
                    snapshot = dict(row["planned_process_snapshot"])
                    snapshot["spin_steps"][0]["rpm"] = 4321
                    await connection.execute(
                        process_executions.update()
                        .where(process_executions.c.id == row["id"])
                        .values(
                            actual_process_snapshot=snapshot,
                            actual_snapshot_schema_version=1,
                            actual_canonical_hash="test-hash",
                            actual_recording_mode="entered",
                        )
                    )
                # The member rows exist from batch creation; verify the join.
                members = (
                    (
                        await connection.execute(
                            process_execution_members.select().where(
                                process_execution_members.c.process_execution_id
                                == rows[0]["id"]
                            )
                        )
                    )
                    .mappings()
                    .all()
                )
                self.assertTrue(members)

        asyncio.run(_record_adjusted_spin())

        payload = self._analysis()
        condition = next(
            row
            for row in payload["conditions"]
            if row["batch_condition_id"] == conditions["control"]
        )
        # One actual variant (the parking planned variant for uncovered
        # substrates lives only in the summaries layer).
        self.assertEqual(len(condition["variants"]), 1)
        variant = condition["variants"][0]
        # Only the spin execution recorded an actual snapshot: its parameters
        # are actual, the never-recorded VCD/anneal parameters fall back to
        # the frozen plan and the variant says "mixed".
        self.assertEqual(variant["feature_source"], "mixed")
        self.assertEqual(variant["features"]["spin_cast_rpm"], 4321)
        self.assertEqual(variant["parameter_origins"]["spin_cast_rpm"], "actual")
        # The spin execution grouped every substrate of the condition.
        self.assertEqual(len(variant["substrate_ids"]), 3)
        planned_rpm = condition["planned_features"]["spin_cast_rpm"]
        self.assertNotEqual(planned_rpm, 4321)
        self.assertEqual(
            variant["features"]["vcd_stage1_pressure_pa"],
            condition["planned_features"]["vcd_stage1_pressure_pa"],
        )
        self.assertEqual(
            variant["parameter_origins"]["vcd_stage1_pressure_pa"], "planned"
        )
        self.assertIn(
            "vcd_stage1_pressure_pa", variant["fallback_reasons"]
        )
        summary = payload["summaries"][0]
        self.assertEqual(summary["feature_source"], "mixed")

    def test_condition_without_actual_records_keeps_planned_variant(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(uploaded, {"A001": conditions["control"]})

        payload = self._analysis()

        for row in payload["conditions"]:
            self.assertEqual(len(row["variants"]), 1)
            variant = row["variants"][0]
            self.assertEqual(variant["feature_source"], "planned")
            self.assertEqual(
                variant["features"], row["planned_features"]
            )
            self.assertEqual(variant["substrate_ids"], [])
            self.assertIn(
                "no perovskite actual process snapshot",
                variant["fallback_reasons"]["no-actual-snapshot"],
            )

    # ------------------------------------------------------------------
    # Digest contract
    # ------------------------------------------------------------------

    def test_digest_is_deterministic_and_rule_sensitive(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(uploaded, {"A001": conditions["control"]})

        first = self._analysis()
        second = self._analysis()
        self.assertEqual(first["content_digest"], second["content_digest"])
        self.assertEqual(len(first["content_digest"]), 64)
        self.assertNotIn(first["generated_at"], first["content_digest"])

        mean_payload = self._analysis(representative="mean")
        self.assertNotEqual(first["content_digest"], mean_payload["content_digest"])

        extra = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-22.0, -21.0])
        )
        self._assign(extra, {"A001": conditions["control"]})
        third = self._analysis()
        self.assertNotEqual(first["content_digest"], third["content_digest"])

    def test_scope_and_exclusion_decisions_change_the_digest(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(uploaded, {"A001": conditions["control"]})
        baseline = self._analysis(batch_id=batch_id)

        # Narrowing the scope to the same batch is the same digest; the
        # unfiltered campaign view must agree because there is only one
        # batch in scope either way.
        unfiltered = self._analysis()
        self.assertEqual(baseline["content_digest"], unfiltered["content_digest"])

        detail = self.client.get(f"/api/results/{uploaded}").json()
        device_id = detail["analysis"]["devices"][0]["device_id"]
        self._assign(
            uploaded,
            {"A001": conditions["control"]},
            exclusions=[{"analysis_device_id": device_id, "reason": "retry needed"}],
        )
        corrected = self.client.post(
            f"/api/results/{uploaded}/assignments",
            json={
                "assignments": [
                    {
                        "analysis_substrate_id": "A001",
                        "batch_condition_id": conditions["control"],
                    }
                ],
                "exclusions": [
                    {
                        "analysis_device_id": device_id,
                        "reason": "retry needed later",
                    }
                ],
                "correction_reason": "updating the exclusion reason",
            },
        )
        self.assertEqual(corrected.status_code, 200, corrected.text)
        after = self._analysis(batch_id=batch_id)
        self.assertNotEqual(baseline["content_digest"], after["content_digest"])

    # ------------------------------------------------------------------
    # Scoping and isolation
    # ------------------------------------------------------------------

    def test_unknown_campaign_is_a_fixed_404(self) -> None:
        response = self.client.get("/api/campaigns/no-such-campaign/analysis")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "campaign not found"})

    def test_invalid_representative_rule_is_rejected(self) -> None:
        response = self.client.get(
            f"/api/campaigns/{CAMPAIGN}/analysis?representative=best"
        )
        self.assertEqual(response.status_code, 422)

    def test_student_sees_only_own_experiments(self) -> None:
        owner_id = self._create_student(STUDENT_USERNAME, STUDENT_PASSWORD)
        other_id = self._create_student(OTHER_USERNAME, OTHER_PASSWORD)
        # Approving a release requires an instructor, so the fixture creates
        # the plans as the administrator in scratch campaigns; adopting the
        # rows into the shared campaign with student ownership reproduces
        # student-owned plans for the scoping predicate under test.
        owner_experiment = asyncio.run(
            _create_released_experiment_with_conditions(
                self.repository, f"{CAMPAIGN}-owner"
            )
        )
        other_experiment = asyncio.run(
            _create_released_experiment_with_conditions(
                self.repository, f"{CAMPAIGN}-other"
            )
        )

        async def _adopt(experiment_id: int, student_id: int, series_version: int) -> None:
            async with self.app.state.database.begin() as connection:
                from web.database import experiments

                await connection.execute(
                    experiments.update()
                    .where(experiments.c.id == experiment_id)
                    .values(
                        campaign_id=CAMPAIGN,
                        series_version=series_version,
                        created_by_id=student_id,
                    )
                )

        asyncio.run(_adopt(owner_experiment, owner_id, 2))
        asyncio.run(_adopt(other_experiment, other_id, 3))
        owner_batch = self._completed_batch(owner_experiment)
        other_batch = self._completed_batch(other_experiment)
        owner_upload = self._upload(
            owner_experiment, owner_batch, multi_device_csv([-20.0, -18.0])
        )
        self._assign(
            owner_upload,
            {"A001": self._condition_ids(owner_batch)["control"]},
        )
        other_upload = self._upload(
            other_experiment, other_batch, multi_device_csv([-40.0, -38.0])
        )
        self._assign(
            other_upload,
            {"A001": self._condition_ids(other_batch)["control"]},
        )

        instructor_payload = self._analysis()
        self.assertEqual(instructor_payload["experiment_count"], 3)
        self.assertEqual(len(instructor_payload["summaries"]), 4)

        self._login_as(STUDENT_USERNAME, STUDENT_PASSWORD)
        owner_payload = self._analysis()
        self.assertEqual(owner_payload["experiment_count"], 1)
        owner_file_ids = {
            entry["result_file_id"] for entry in owner_payload["measurements"]
        }
        self.assertEqual(owner_file_ids, {owner_upload})
        self.assertNotIn(
            other_upload,
            [entry["result_file_id"] for entry in owner_payload["measurements"]],
        )
        # The digest covers only the visible inputs: it must differ from the
        # instructor digest and must not leak other students' file identity.
        self.assertNotEqual(
            owner_payload["content_digest"], instructor_payload["content_digest"]
        )

        self._login_as(OTHER_USERNAME, OTHER_PASSWORD)
        other_payload = self._analysis()
        self.assertEqual(other_payload["experiment_count"], 1)
        other_file_ids = {
            entry["result_file_id"] for entry in other_payload["measurements"]
        }
        self.assertEqual(other_file_ids, {other_upload})

    def test_batch_filter_narrows_scope(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(uploaded, {"A001": conditions["control"]})

        payload = self._analysis(batch_id=batch_id)
        self.assertEqual(len(payload["summaries"]), 2)
        self.assertEqual(payload["scope"]["fabrication_batch_id"], batch_id)

        # A batch of another experiment is invisible to the query rather
        # than an error: the scope simply contains no data for it.
        empty = self._analysis(batch_id=999999)
        self.assertEqual(empty["summaries"], [])
        self.assertEqual(empty["measurements"], [])

    def test_oversized_scope_is_an_explicit_400(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        first = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(first, {"A001": conditions["control"]})
        second = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-30.0, -28.0])
        )
        self._assign(second, {"A001": conditions["control"]})

        from web import campaign_analysis as compute

        with mock.patch.object(compute, "MAX_RESULT_FILES_PER_REQUEST", 1):
            response = self.client.get(
                f"/api/campaigns/{CAMPAIGN}/analysis"
            )
        self.assertEqual(response.status_code, 400)
        self.assertIn("limit is 1", response.json()["detail"])

    def test_coverage_reports_measured_and_denominator_basis(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(uploaded, {"A001": conditions["control"]})

        payload = self._analysis()
        control = next(
            row
            for row in payload["coverage"]
            if row["batch_condition_id"] == conditions["control"]
        )
        target = next(
            row
            for row in payload["coverage"]
            if row["batch_condition_id"] == conditions["target"]
        )
        self.assertEqual(control["measured_substrate_count"], 1)
        self.assertEqual(control["denominator_basis"], "actual")
        self.assertEqual(control["denominator_value"], 1)
        self.assertEqual(control["fraction"], 1.0)
        self.assertEqual(target["measured_substrate_count"], 0)
        self.assertEqual(target["fraction"], 0.0)
        self.assertIn("never automatically treated as a fabrication failure", target["note"])

    def test_condition_role_comparison_uses_substrate_equal_weighted_means(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        control_upload = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(control_upload, {"A001": conditions["control"]})
        # The target substrate needs its own laser mark; the fixture layout
        # has two device channels, so mark A002 belongs to the target
        # condition's first substrate.
        target_upload = self._upload(
            self.experiment_id,
            batch_id,
            multi_device_csv([-40.0, -38.0], device_labels=["A002 Channel 1"]),
            filename="A002 Channel 1.csv",
        )
        self._assign(target_upload, {"A002": conditions["target"]})

        payload = self._analysis()

        forward_comparisons = [
            row
            for row in payload["comparisons"]
            if row["direction"] == "forward" and row["metric"] == "pce"
        ]
        self.assertEqual(len(forward_comparisons), 1)
        comparison = forward_comparisons[0]
        self.assertEqual(
            comparison["control_batch_condition_id"], conditions["control"]
        )
        self.assertEqual(
            comparison["target_batch_condition_id"], conditions["target"]
        )
        self.assertAlmostEqual(comparison["control_mean"], 10.0)
        self.assertAlmostEqual(comparison["target_mean"], 20.0)
        self.assertAlmostEqual(comparison["difference"], 10.0)
        self.assertAlmostEqual(comparison["percent_change"], 100.0)
        self.assertEqual(comparison["n_control_units"], 1)
        self.assertEqual(comparison["n_target_units"], 1)
        self.assertIn("no significance test", comparison["inference_note"])

    def test_zero_control_mean_yields_null_percent_change(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        control_upload = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(control_upload, {"A001": conditions["control"]})
        target_upload = self._upload(
            self.experiment_id,
            batch_id,
            multi_device_csv([-40.0, -38.0], device_labels=["A002 Channel 1"]),
            filename="A002 Channel 1.csv",
        )
        self._assign(target_upload, {"A002": conditions["target"]})

        async def _zero_the_control_pce() -> None:
            async with self.app.state.database.begin() as connection:
                from web.database import result_files

                row = (
                    await connection.execute(
                        result_files.select().where(result_files.c.id == control_upload)
                    )
                ).mappings().one()
                analysis = dict(row["analysis"])
                for direction in ("forward", "reverse"):
                    analysis["devices"][0]["metrics"][direction]["pce"] = 0.0
                    for trace in analysis["devices"][0]["traces"]:
                        if trace["direction"] == direction:
                            trace["metrics"]["pce"] = 0.0
                await connection.execute(
                    result_files.update()
                    .where(result_files.c.id == control_upload)
                    .values(analysis=analysis)
                )

        asyncio.run(_zero_the_control_pce())

        payload = self._analysis()
        comparison = next(
            row
            for row in payload["comparisons"]
            if row["direction"] == "forward" and row["metric"] == "pce"
        )
        self.assertEqual(comparison["control_mean"], 0.0)
        self.assertIsNone(comparison["percent_change"])
        self.assertEqual(comparison["difference"], 20.0)

    def test_units_declare_ff_fraction_and_single_conversion(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(uploaded, {"A001": conditions["control"]})

        payload = self._analysis()
        self.assertEqual(payload["units"]["ff"], "fraction (0-1)")
        self.assertEqual(
            payload["units"]["pce"], "percent of 1 sun (mW/cm2 at 1 sun)"
        )
        summary = next(row for row in payload["summaries"] if row["direction"] == "forward")
        self.assertTrue(0.0 < summary["metrics"]["ff"] < 1.0)

    # ------------------------------------------------------------------
    # Review regressions (PR #44 round 2): multi-variant diagnostics,
    # digest sensitivity, and mixed-provenance comparisons
    # ------------------------------------------------------------------

    def _record_measurement_shortfall(
        self, batch_id: int, condition_id: int, reason: str
    ) -> None:
        """Record the typed deviation that unlocks measuring fewer substrates
        than the batch recorded as made (measurement_shortfall, not the
        fabrication shortfall the completion gate uses)."""

        from datetime import datetime, timezone

        from sqlalchemy import insert

        from web.database import execution_deviations

        async def _work() -> None:
            async with self.app.state.database.begin() as connection:
                now = datetime.now(timezone.utc)
                await connection.execute(
                    insert(execution_deviations).values(
                        fabrication_batch_id=batch_id,
                        category="process",
                        severity="info",
                        deviation_type="measurement_shortfall",
                        description=reason,
                        recorded_by_id=1,
                        recorded_at=now,
                        condition_id=condition_id,
                        created_at=now,
                    )
                )

        asyncio.run(_work())

    def _substrate_ids(self, condition_id: int) -> list[int]:
        from sqlalchemy import select

        from web.database import fabrication_substrates

        async def _query() -> list[int]:
            async with self.app.state.database.begin() as connection:
                rows = (
                    await connection.execute(
                        select(fabrication_substrates.c.id)
                        .where(
                            fabrication_substrates.c.batch_condition_id
                            == condition_id
                        )
                        .order_by(fabrication_substrates.c.substrate_ordinal)
                    )
                ).scalars().all()
            return [int(row) for row in rows]

        return asyncio.run(_query())

    def _record_actual_spin(
        self,
        batch_id: int,
        condition_id: int,
        *,
        rpm: int,
        keep_substrate_ids: list[int] | None = None,
    ) -> None:
        """Record one actual spin snapshot for the condition's execution,
        optionally trimming its membership to the given substrates."""

        from sqlalchemy import delete, select, update

        from web.database import process_execution_members, process_executions

        async def _work() -> None:
            async with self.app.state.database.begin() as connection:
                source = (
                    (
                        await connection.execute(
                            select(process_executions)
                            .select_from(process_executions)
                            .join(
                                process_execution_members,
                                process_execution_members.c.process_execution_id
                                == process_executions.c.id,
                            )
                            .where(
                                process_execution_members.c.batch_condition_id
                                == condition_id,
                                process_executions.c.layer_type == "perovskite",
                                process_executions.c.method == "spin_coating",
                            )
                        )
                    )
                    .mappings()
                    .first()
                )
                self.assertIsNotNone(source)
                snapshot = json.loads(json.dumps(source["planned_process_snapshot"]))
                snapshot["spin_steps"][0]["rpm"] = rpm
                await connection.execute(
                    update(process_executions)
                    .where(process_executions.c.id == source["id"])
                    .values(
                        actual_process_snapshot=snapshot,
                        actual_snapshot_schema_version=1,
                        actual_canonical_hash=f"test-hash-{rpm}",
                        actual_recording_mode="entered",
                    )
                )
                if keep_substrate_ids is not None:
                    await connection.execute(
                        delete(process_execution_members).where(
                            process_execution_members.c.process_execution_id
                            == source["id"],
                            process_execution_members.c.substrate_id.not_in(
                                keep_substrate_ids
                            ),
                        )
                    )

        asyncio.run(_work())

    def _split_second_spin_variant(
        self,
        batch_id: int,
        condition_id: int,
        *,
        substrate_id: int,
        main_rpm: int,
        other_rpm: int,
    ) -> None:
        """Move one substrate onto a second spin execution with its own
        actual snapshot, so the condition carries two actual variants."""

        from datetime import datetime, timezone

        from sqlalchemy import delete, insert, select, update

        from web.database import (
            process_execution_members,
            process_executions,
        )

        async def _work() -> None:
            async with self.app.state.database.begin() as connection:
                source = (
                    (
                        await connection.execute(
                            select(process_executions)
                            .select_from(process_executions)
                            .join(
                                process_execution_members,
                                process_execution_members.c.process_execution_id
                                == process_executions.c.id,
                            )
                            .where(
                                process_execution_members.c.batch_condition_id
                                == condition_id,
                                process_executions.c.layer_type == "perovskite",
                                process_executions.c.method == "spin_coating",
                            )
                        )
                    )
                    .mappings()
                    .first()
                )
                self.assertIsNotNone(source)
                planned = json.loads(json.dumps(source["planned_process_snapshot"]))
                main_snapshot = json.loads(json.dumps(planned))
                main_snapshot["spin_steps"][0]["rpm"] = main_rpm
                other_snapshot = json.loads(json.dumps(planned))
                other_snapshot["spin_steps"][0]["rpm"] = other_rpm
                await connection.execute(
                    update(process_executions)
                    .where(process_executions.c.id == source["id"])
                    .values(
                        actual_process_snapshot=main_snapshot,
                        actual_snapshot_schema_version=1,
                        actual_canonical_hash=f"test-hash-{main_rpm}",
                        actual_recording_mode="entered",
                    )
                )
                member = (
                    (
                        await connection.execute(
                            select(process_execution_members).where(
                                process_execution_members.c.process_execution_id
                                == source["id"],
                                process_execution_members.c.substrate_id
                                == substrate_id,
                            )
                        )
                    )
                    .mappings()
                    .one()
                )
                await connection.execute(
                    delete(process_execution_members).where(
                        process_execution_members.c.id == member["id"]
                    )
                )
                now = datetime.now(timezone.utc)
                inserted = await connection.execute(
                    insert(process_executions).values(
                        fabrication_batch_id=batch_id,
                        execution_code=f"{source['execution_code']}-v2",
                        method=source["method"],
                        layer_role=source["layer_role"],
                        layer_type=source["layer_type"],
                        layer_name=source["layer_name"],
                        status="cancelled",
                        is_shared=source["is_shared"],
                        planned_process_snapshot=source["planned_process_snapshot"],
                        planned_snapshot_schema_version=source[
                            "planned_snapshot_schema_version"
                        ],
                        planned_canonical_hash=source["planned_canonical_hash"],
                        actual_process_snapshot=other_snapshot,
                        actual_snapshot_schema_version=1,
                        actual_canonical_hash=f"test-hash-{other_rpm}",
                        actual_recording_mode="entered",
                        created_at=now,
                        updated_at=now,
                    )
                )
                new_execution_id = inserted.inserted_primary_key[0]
                await connection.execute(
                    insert(process_execution_members).values(
                        process_execution_id=new_execution_id,
                        substrate_id=substrate_id,
                        batch_condition_id=condition_id,
                        layer_ordinal=member["layer_ordinal"],
                        layer_snapshot_hash=member["layer_snapshot_hash"],
                    )
                )

        asyncio.run(_work())

    def test_multi_variant_control_diagnostic_carries_batch_context(self) -> None:
        """A control executed under two actual variants must still produce a
        full HTTP 200 response whose skip diagnostic names the batch (the
        response model previously rejected the extra field)."""

        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        control_substrates = self._substrate_ids(conditions["control"])
        self._split_second_spin_variant(
            batch_id,
            conditions["control"],
            substrate_id=control_substrates[1],
            main_rpm=4321,
            other_rpm=5000,
        )

        payload = self._analysis()

        multi = next(
            diagnostic
            for diagnostic in payload["diagnostics"]
            if diagnostic["code"] == "comparison-skipped-multi-variant"
        )
        self.assertEqual(multi["batch_id"], batch_id)
        self.assertEqual(multi["batch_condition_id"], conditions["control"])
        self.assertEqual(payload["comparisons"], [])

    def test_multi_variant_target_diagnostic_carries_batch_context(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        target_substrates = self._substrate_ids(conditions["target"])
        self._split_second_spin_variant(
            batch_id,
            conditions["target"],
            substrate_id=target_substrates[1],
            main_rpm=4321,
            other_rpm=5000,
        )

        payload = self._analysis()

        multi = next(
            diagnostic
            for diagnostic in payload["diagnostics"]
            if diagnostic["code"] == "comparison-skipped-multi-variant"
        )
        self.assertEqual(multi["batch_id"], batch_id)
        self.assertEqual(multi["batch_condition_id"], conditions["target"])
        self.assertEqual(payload["comparisons"], [])

    def test_comparison_skips_mixed_actual_and_planned_leftover_provenance(self) -> None:
        """An actual variant beside measured planned-provenance leftovers
        must not pool both into one control mean."""

        batch_id = self._completed_batch(
            self.experiment_id, substrates_per_condition=2
        )
        conditions = self._condition_ids(batch_id)
        control_substrates = self._substrate_ids(conditions["control"])
        # The recorded actual variant covers only the first substrate; the
        # unmeasured second substrate needs its typed shortfall deviation.
        self._record_measurement_shortfall(
            batch_id,
            conditions["control"],
            "Test setup: substrate 2 measured under planned provenance.",
        )
        self._record_actual_spin(
            batch_id,
            conditions["control"],
            rpm=4321,
            keep_substrate_ids=[control_substrates[0]],
        )
        inside = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(inside, {"A001": conditions["control"]})
        leftover = self._upload(
            self.experiment_id,
            batch_id,
            multi_device_csv([-30.0, -28.0], device_labels=["A002 Channel 1"]),
            filename="A002 Channel 1.csv",
        )
        self._assign(leftover, {"A002": conditions["control"]})

        payload = self._analysis()

        codes = {diagnostic["code"] for diagnostic in payload["diagnostics"]}
        self.assertIn("comparison-skipped-mixed-provenance", codes)
        skipped = next(
            diagnostic
            for diagnostic in payload["diagnostics"]
            if diagnostic["code"] == "comparison-skipped-mixed-provenance"
        )
        self.assertEqual(skipped["batch_condition_id"], conditions["control"])
        self.assertEqual(skipped["batch_id"], batch_id)
        # No comparison may pool the actual-variant mean (10) with the
        # leftover mean (15) into a fabricated 12.5.
        self.assertEqual(payload["comparisons"], [])

    def test_comparison_survives_when_every_measured_substrate_is_covered(self) -> None:
        """The mixed-provenance skip must not over-fire: a single actual
        variant that covers every measured substrate still compares."""

        batch_id = self._completed_batch(
            self.experiment_id, substrates_per_condition=2
        )
        conditions = self._condition_ids(batch_id)
        control_substrates = self._substrate_ids(conditions["control"])
        self._record_measurement_shortfall(
            batch_id,
            conditions["control"],
            "Test setup: only the covered substrate is measured.",
        )
        self._record_actual_spin(
            batch_id,
            conditions["control"],
            rpm=4321,
            keep_substrate_ids=control_substrates,
        )
        self._record_measurement_shortfall(
            batch_id,
            conditions["target"],
            "Test setup: only the target substrate under comparison is measured.",
        )
        inside = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(inside, {"A001": conditions["control"]})
        target = self._upload(
            self.experiment_id,
            batch_id,
            multi_device_csv([-40.0, -38.0], device_labels=["A004 Channel 1"]),
            filename="A004 Channel 1.csv",
        )
        self._assign(target, {"A004": conditions["target"]})

        payload = self._analysis()

        comparison = next(
            row
            for row in payload["comparisons"]
            if row["direction"] == "forward" and row["metric"] == "pce"
        )
        self.assertAlmostEqual(comparison["control_mean"], 10.0)
        self.assertAlmostEqual(comparison["target_mean"], 20.0)
        self.assertNotIn(
            "comparison-skipped-mixed-provenance",
            {diagnostic["code"] for diagnostic in payload["diagnostics"]},
        )

    def test_digest_senses_coverage_denominator_change(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(uploaded, {"A001": conditions["control"]})
        baseline = self._analysis()

        from sqlalchemy import update

        from web.database import fabrication_batch_conditions

        async def _change_denominator() -> None:
            async with self.app.state.database.begin() as connection:
                await connection.execute(
                    update(fabrication_batch_conditions)
                    .where(
                        fabrication_batch_conditions.c.id == conditions["control"]
                    )
                    .values(actual_substrate_count=2)
                )

        asyncio.run(_change_denominator())

        after = self._analysis()
        self.assertEqual(after["coverage"][0]["denominator_value"], 2)
        self.assertNotEqual(baseline["content_digest"], after["content_digest"])

    def test_digest_senses_frozen_plan_parameter_change(self) -> None:
        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(uploaded, {"A001": conditions["control"]})
        baseline = self._analysis()

        from sqlalchemy import select, update

        from web.database import fabrication_batch_conditions

        async def _change_plan() -> None:
            async with self.app.state.database.begin() as connection:
                row = (
                    (
                        await connection.execute(
                            select(fabrication_batch_conditions).where(
                                fabrication_batch_conditions.c.id
                                == conditions["control"]
                            )
                        )
                    )
                    .mappings()
                    .one()
                )
                snapshot = json.loads(json.dumps(row["recipe_snapshot"]))
                snapshot["deposition_process"]["spin_steps"][0]["rpm"] += 1
                await connection.execute(
                    update(fabrication_batch_conditions)
                    .where(fabrication_batch_conditions.c.id == conditions["control"])
                    .values(recipe_snapshot=snapshot)
                )

        asyncio.run(_change_plan())

        after = self._analysis()
        condition = next(
            row
            for row in after["conditions"]
            if row["batch_condition_id"] == conditions["control"]
        )
        self.assertNotEqual(
            condition["planned_features"]["spin_cast_rpm"],
            baseline["conditions"][0]["planned_features"]["spin_cast_rpm"],
        )
        self.assertNotEqual(baseline["content_digest"], after["content_digest"])

    def test_digest_senses_effective_analysis_change_without_file_change(self) -> None:
        """Correcting stored trace metrics changes the payload and must
        change the digest even though the raw bytes (and file sha256) do
        not move."""

        batch_id = self._completed_batch(self.experiment_id)
        conditions = self._condition_ids(batch_id)
        uploaded = self._upload(
            self.experiment_id, batch_id, multi_device_csv([-20.0, -18.0])
        )
        self._assign(uploaded, {"A001": conditions["control"]})
        baseline = self._analysis()

        from sqlalchemy import select, update

        from web.database import result_files

        async def _correct_metrics() -> None:
            async with self.app.state.database.begin() as connection:
                row = (
                    (
                        await connection.execute(
                            select(result_files).where(result_files.c.id == uploaded)
                        )
                    )
                    .mappings()
                    .one()
                )
                analysis = json.loads(json.dumps(row["analysis"]))
                device = analysis["devices"][0]
                device["metrics"]["forward"]["pce"] = 20.0
                for trace in device["traces"]:
                    if trace["direction"] == "forward" and trace.get("metrics"):
                        trace["metrics"]["pce"] = 20.0
                await connection.execute(
                    update(result_files)
                    .where(result_files.c.id == uploaded)
                    .values(analysis=analysis)
                )

        asyncio.run(_correct_metrics())

        after = self._analysis()
        summary = next(
            row
            for row in after["summaries"]
            if row["batch_condition_id"] == conditions["control"]
            and row["direction"] == "forward"
        )
        self.assertAlmostEqual(summary["metrics"]["pce"], 20.0)
        self.assertNotEqual(baseline["content_digest"], after["content_digest"])


if __name__ == "__main__":
    unittest.main()
