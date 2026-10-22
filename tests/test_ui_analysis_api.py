"""UI Phase 3 regression contracts for the analysis overlay and assignments.

The fixture is composed rather than inherited, so its existing scan-history
tests do not run a second time. Publication rendering stays unchanged.
"""

from __future__ import annotations

import re
import unittest
from unittest.mock import patch

from tests import test_device_scan_stats as scan_fixtures
from tests.test_device_scan_stats import repeat_scan_csv
from tests.workflow_access_fixtures import grant_created_workflow_user
from web.publication_plots import CATEGORICAL_PALETTES, PlotUnavailableError


class AnalysisOverlayApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = scan_fixtures.DeviceScanStatsTests()
        self.fixture.setUp()
        self.client = self.fixture.client

    def tearDown(self) -> None:
        self.fixture.tearDown()

    def _result(self, name: str = "overlay.csv", current: float = 24.0) -> int:
        file_id = self.fixture._upload(name, repeat_scan_csv([("forward", current)]))
        self.fixture._assign_control(file_id)
        return file_id

    def _svg(self, file_ids: list[int], palette: str = "science-tol") -> str:
        response = self.client.get(
            "/api/analysis/jv-overlay",
            params=[*(('result_id', file_id) for file_id in file_ids), ('palette', palette)],
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.headers["content-type"], "image/svg+xml")
        self.assertIn("<svg", response.text)
        return response.text

    def test_assignment_get_and_post_remain_available_beside_overlay(self) -> None:
        file_id = self.fixture._upload("assignment.csv", repeat_scan_csv([("forward", 24.0)]))
        before = self.client.get(f"/api/results/{file_id}/assignments")
        self.assertEqual(before.status_code, 200, before.text)
        self.assertEqual(before.json(), [])
        # Rendering must neither shadow nor remove either assignments route.
        self._svg([file_id])
        detail = self.client.get(f"/api/results/{file_id}").json()
        control_id = next(group["batch_condition_id"] for group in detail["groups"] if group["kind"] == "control")
        assigned = self.client.post(
            f"/api/results/{file_id}/assignments",
            json={"assignments": [{"analysis_substrate_id": "A001", "batch_condition_id": control_id}]},
        )
        self.assertEqual(assigned.status_code, 200, assigned.text)
        after = self.client.get(f"/api/results/{file_id}/assignments")
        self.assertEqual(after.status_code, 200, after.text)
        self.assertEqual(len(after.json()), 1)
        self.assertEqual(after.json()[0]["analysis_substrate_id"], "A001")
        self.assertEqual(after.json()[0]["batch_condition_id"], control_id)

    def test_direct_overlay_url_returns_private_svg_and_frozen_palette(self) -> None:
        file_id = self._result()
        # This is the same-origin URL an authenticated <img> can request.
        response = self.client.get(
            f"/api/analysis/jv-overlay?result_id={file_id}&format=svg&palette=science-tol",
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.headers["content-type"], "image/svg+xml")
        self.assertIn("no-store", response.headers["cache-control"])
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(response.headers["content-disposition"], 'inline; filename="overlay-jv.svg"')
        self.assertIn("12.00%", response.text)
        self.assertIn(CATEGORICAL_PALETTES["science-tol"][0].lower(), response.text.lower())

    def test_overlay_uses_best_forward_scan_even_with_lower_pinned_representative(self) -> None:
        file_id = self.fixture._upload(
            "repeat.csv", repeat_scan_csv([("forward", 20.0), ("forward", 24.0), ("reverse", 80.0)]),
        )
        self.fixture._assign_control(file_id)
        device_id = self.fixture._fabrication_device_id(file_id)
        chosen = self.client.put(
            f"/api/fabrication-devices/{device_id}/jv-scans/representative",
            json={"direction": "forward", "result_file_id": file_id, "trace_id": "trace-001"},
        )
        self.assertEqual(chosen.status_code, 200, chosen.text)
        self.assertEqual(chosen.json()["representative"]["forward"]["metrics"]["pce"], 10.0)
        svg = self._svg([file_id])
        self.assertIn("12.00%", svg)
        self.assertNotIn("10.00%", svg)
        self.assertNotIn("40.00%", svg)

    def test_overlay_obeys_saved_exclusions_and_restoration(self) -> None:
        excluded = self._result("excluded.csv", 24.0)
        included = self._result("included.csv", 20.0)
        self.fixture._set_excluded(excluded, True)
        svg = self._svg([excluded, included])
        self.assertIn("10.00%", svg)
        self.assertNotIn("12.00%", svg)
        empty = self.client.get("/api/analysis/jv-overlay", params={"result_id": excluded})
        self.assertEqual(empty.status_code, 400, empty.text)
        self.assertEqual(empty.json()["detail"], "selected results have no valid forward J-V traces")
        self.fixture._set_excluded(excluded, False)
        self.assertIn("12.00%", self._svg([excluded]))

    def test_overlay_checks_all_results_and_rejects_other_owners_before_rendering(self) -> None:
        file_id = self._result()
        with patch("web.routes.results.render_jv_overlay") as renderer:
            mixed = self.client.get(
                "/api/analysis/jv-overlay", params=[("result_id", file_id), ("result_id", 999999)],
            )
            self.assertEqual(mixed.status_code, 404, mixed.text)
            renderer.assert_not_called()
            created = self.client.post("/api/users", json={
                "username": "overlay-peer", "display_name": "Overlay peer",
                "password": "overlay peer password 2026", "role": "student",
            })
            grant_created_workflow_user(self.client, created)
            self.assertEqual(created.status_code, 201, created.text)
            self.assertEqual(self.client.post("/api/auth/logout").status_code, 204)
            self.client.headers.pop("X-CSRF-Token", None)
            unauthenticated = self.client.get("/api/analysis/jv-overlay", params={"result_id": file_id})
            self.assertEqual(unauthenticated.status_code, 401, unauthenticated.text)
            token = self.client.get("/api/auth/login-csrf").json()["login_csrf_token"]
            login = self.client.post("/api/auth/login", json={
                "username": "overlay-peer", "password": "overlay peer password 2026", "login_csrf": token,
            })
            self.assertEqual(login.status_code, 200, login.text)
            unauthorized = self.client.get("/api/analysis/jv-overlay", params={"result_id": file_id})
            self.assertEqual(unauthorized.status_code, 404, unauthorized.text)
            renderer.assert_not_called()

    def test_overlay_validates_selection_palette_and_rendering_errors(self) -> None:
        file_id = self._result()
        duplicates = self._svg([file_id, file_id])
        self.assertEqual(duplicates.count("12.00%"), 1)
        for params, status in (
            ([], 400),
            ([("result_id", value) for value in range(1, 14)], 400),
            ([("result_id", file_id), ("palette", "unknown")], 400),
            ([("result_id", file_id), ("format", "png")], 422),
        ):
            with self.subTest(params=params):
                response = self.client.get("/api/analysis/jv-overlay", params=params)
                self.assertEqual(response.status_code, status, response.text)
        with patch("web.routes.results.render_jv_overlay", side_effect=PlotUnavailableError("plot dependency unavailable")):
            unavailable = self.client.get("/api/analysis/jv-overlay", params={"result_id": file_id})
        self.assertEqual(unavailable.status_code, 503, unavailable.text)
        self.assertEqual(unavailable.json()["detail"], "plot dependency unavailable")

    def test_analysis_page_keeps_per_request_nonce_and_same_origin_image_csp(self) -> None:
        nonces = []
        for _ in range(2):
            response = self.client.get("/app/analysis")
            self.assertEqual(response.status_code, 200, response.text)
            match = re.search(r'<meta name="csp-nonce" content="([^"]+)"', response.text)
            self.assertIsNotNone(match)
            assert match is not None
            nonce = match.group(1)
            nonces.append(nonce)
            directives = dict(
                directive.strip().split(" ", 1)
                for directive in response.headers["content-security-policy"].split(";")
                if directive.strip()
            )
            self.assertEqual(directives["style-src"], f"'self' 'nonce-{nonce}'")
            self.assertEqual(directives["img-src"], "'self' data:")
        self.assertNotEqual(nonces[0], nonces[1])


if __name__ == "__main__":
    unittest.main()
