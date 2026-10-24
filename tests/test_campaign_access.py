"""Campaign access-control acceptance matrix (docs/campaign-access-matrix.md).

Two campaigns, three students plus one teacher in campaign A, a non-member
student, and an administrator: proves same-campaign read sharing,
cross-campaign invisibility, the single-owner write boundary, manager
review-without-editing, membership management guards, and immediate
revocation for live sessions.
"""

from __future__ import annotations

import asyncio
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from tests.campaign_access_fixtures import grant_campaign_member
from tests.layout_fixtures import seed_standard_layouts
from tests.workflow_access_fixtures import grant_user
from web import create_app
from web.auth import hash_password
from web.repository import UserRole, WebRepository

ADMIN = ("campaign-access-admin", "Campaign access admin password 2026")
TEACHER = ("campaign-a-teacher", "Campaign A teacher password 2026")
STUDENT_A1 = ("student-a1", "Student A1 password 2026")
STUDENT_A2 = ("student-a2", "Student A2 password 2026")
READER_A = ("reader-a", "Reader A password 2026")
STUDENT_B = ("student-b", "Student B password 2026")
OUTSIDER = ("outsider", "Outsider password 2026")

CAMPAIGN_A = "campaign-a"
CAMPAIGN_B = "campaign-b"


class CampaignAccessMatrixTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temporary_directory.name) / "access.sqlite3"
        self.app = create_app(
            self.database_path,
            secure_cookies=False,
            _test_user=(ADMIN[0], ADMIN[1], UserRole.ADMINISTRATOR),
        )
        self.client_context = TestClient(self.app)
        self.client = self.client_context.__enter__()
        self.repository: WebRepository = self.app.state.repository
        self.login(ADMIN[0], ADMIN[1])

        seed_standard_layouts(self.client)
        for code, name in ((CAMPAIGN_A, "Campaign A"), (CAMPAIGN_B, "Campaign B")):
            created = self.client.post(
                "/api/campaigns",
                json={"code": code, "display_name": name, "description": ""},
            )
            self.assertEqual(created.status_code, 201, created.text)

        # The administrator (creator) is automatically campaign manager.
        self.ids: dict[str, int] = {ADMIN[0]: 1}
        for username, password, role in (
            (*TEACHER, UserRole.INSTRUCTOR),
            (*STUDENT_A1, UserRole.STUDENT),
            (*STUDENT_A2, UserRole.STUDENT),
            (*READER_A, UserRole.STUDENT),
            (*STUDENT_B, UserRole.STUDENT),
            (*OUTSIDER, UserRole.STUDENT),
        ):
            user = asyncio.run(
                self.repository.create_user(
                    username=username,
                    display_name=username.replace("-", " ").title(),
                    password_hash=hash_password(password),
                    role=role,
                )
            )
            self.ids[username] = user.id
            # Every account receives the fabrication workflow grant;
            # campaign membership stays the variable under test.
            asyncio.run(grant_user(self.app.state.database, user.id))

        # Campaign A: teacher manages, two students participate, one reads.
        grant_campaign_member(self.client, CAMPAIGN_A, self.ids[TEACHER[0]], "manager")
        grant_campaign_member(
            self.client, CAMPAIGN_A, self.ids[STUDENT_A1[0]], "participant"
        )
        grant_campaign_member(
            self.client, CAMPAIGN_A, self.ids[STUDENT_A2[0]], "participant"
        )
        grant_campaign_member(self.client, CAMPAIGN_A, self.ids[READER_A[0]], "reader")
        # Campaign B: one student participant.
        grant_campaign_member(
            self.client, CAMPAIGN_B, self.ids[STUDENT_B[0]], "participant"
        )
        self.logout()

    def tearDown(self) -> None:
        self.client_context.__exit__(None, None, None)
        self.temporary_directory.cleanup()

    # ------------------------------------------------------------------
    # Session helpers
    # ------------------------------------------------------------------

    def login(self, username: str, password: str) -> None:
        csrf = self.client.get("/api/auth/login-csrf").json()["login_csrf_token"]
        response = self.client.post(
            "/api/auth/login",
            json={
                "username": username,
                "password": password,
                "login_csrf": csrf,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.client.headers["X-CSRF-Token"] = self.client.cookies.get("perovskite_csrf")

    def logout(self) -> None:
        response = self.client.post("/api/auth/logout")
        self.assertEqual(response.status_code, 204)
        self.client.headers.pop("X-CSRF-Token", None)

    def seed_experiment_in(self, campaign_code: str, owner: tuple[str, str]) -> int:
        """Create a review-ready experiment in one campaign as one member."""
        import json as _json

        from perovskite_bo import deposition_recipe_from_process
        from tests.test_web_app import complete_guided_setup

        device_recipe, deposition_process = complete_guided_setup()
        for group in device_recipe["experimental_groups"]:
            if group["kind"] == "target":
                group["adjustments"] = []
                group["layers"] = [_json.loads(_json.dumps(device_recipe["layers"]))][0]
                group["deposition_process"] = _json.loads(
                    _json.dumps(deposition_process)
                )
        self.login(owner[0], owner[1])
        created = self.client.post(
            "/api/experiments",
            json={
                "campaign_id": campaign_code,
                "recipe": {
                    **deposition_recipe_from_process(deposition_process),
                    "device_recipe": device_recipe,
                },
                "condition_plans": [
                    {
                        "group_id": group["group_id"],
                        "role": group["kind"],
                        "device_layout_code": "15x15_dual_005",
                        "planned_substrate_count": 3,
                    }
                    for group in device_recipe["experimental_groups"]
                ],
            },
        )
        self.assertEqual(created.status_code, 201, created.text)
        experiment_id = int(created.json()["id"])
        self.logout()
        return experiment_id

    # ------------------------------------------------------------------
    # Visibility matrix
    # ------------------------------------------------------------------

    def test_listing_and_detail_visibility_matrix(self) -> None:
        a_experiment = self.seed_experiment_in(CAMPAIGN_A, STUDENT_A1)
        b_experiment = self.seed_experiment_in(CAMPAIGN_B, STUDENT_B)

        # Same-campaign participants see peers' records...
        self.login(*STUDENT_A2)
        self.assertEqual(
            self.client.get(f"/api/experiments/{a_experiment}").status_code, 200
        )
        listing = self.client.get("/api/experiments").json()
        self.assertEqual([record["id"] for record in listing], [a_experiment])
        # ...and campaign B's experiment is invisible (uniform 404).
        self.assertEqual(
            self.client.get(f"/api/experiments/{b_experiment}").status_code, 404
        )

        # Cross-campaign the other way around.
        self.logout()
        self.login(*STUDENT_B)
        self.assertEqual(
            self.client.get(f"/api/experiments/{a_experiment}").status_code, 404
        )
        self.assertEqual(
            [r["id"] for r in self.client.get("/api/experiments").json()],
            [b_experiment],
        )

        # A reader member sees campaign A but creates nothing.
        self.logout()
        self.login(*READER_A)
        self.assertEqual(
            self.client.get(f"/api/experiments/{a_experiment}").status_code, 200
        )
        denied = self.client.post(
            "/api/experiments",
            json={"campaign_id": CAMPAIGN_A, "recipe": _minimal_recipe()},
        )
        self.assertEqual(denied.status_code, 403, denied.text)

        # A member-less student sees no campaign at all.
        self.logout()
        self.login(*OUTSIDER)
        self.assertEqual(self.client.get("/api/campaigns").json(), [])
        self.assertEqual(self.client.get("/api/experiments").json(), [])
        self.assertEqual(
            self.client.get(f"/api/experiments/{a_experiment}").status_code, 404
        )

        # Administrators read everywhere.
        self.logout()
        self.login(ADMIN[0], ADMIN[1])
        visible = sorted(r["id"] for r in self.client.get("/api/experiments").json())
        self.assertEqual(visible, sorted([a_experiment, b_experiment]))

    def test_forged_cross_campaign_ids_fail_closed(self) -> None:
        a_experiment = self.seed_experiment_in(CAMPAIGN_A, STUDENT_A1)
        self.seed_experiment_in(CAMPAIGN_B, STUDENT_B)
        self.login(*STUDENT_B)
        # Every indirect handle into campaign A denies identically.
        for path in (
            f"/api/experiments/{a_experiment}",
            f"/api/experiments/{a_experiment}/conditions",
            f"/api/experiments/{a_experiment}/fabrication-batches",
            f"/experiments/{a_experiment}/export.json",
            f"/experiments/{a_experiment}/export.pdf",
        ):
            self.assertEqual(
                self.client.get(path).status_code,
                404,
                path,
            )
        analysis = self.client.get(f"/api/campaigns/{CAMPAIGN_A}/analysis")
        self.assertEqual(analysis.status_code, 404, analysis.text)

    def test_workflow_grant_is_independent_of_membership(self) -> None:
        """Membership without a workflow grant still cannot reach the
        workflow API surface."""
        ungranted = asyncio.run(
            self.repository.create_user(
                username="member-without-grant",
                display_name="Member Without Grant",
                password_hash=hash_password("Member without grant password 2026"),
                role=UserRole.STUDENT,
            )
        )
        grant_campaign_member(
            self.client, CAMPAIGN_A, ungranted.id, "participant"
        )
        self.login("member-without-grant", "Member without grant password 2026")
        response = self.client.get("/api/experiments")
        self.assertEqual(response.status_code, 403, response.text)
        self.assertIn("workflow access", response.json()["detail"])

    # ------------------------------------------------------------------
    # Owner-only content writes
    # ------------------------------------------------------------------

    def test_owner_boundary_for_content_writes(self) -> None:
        experiment = self.seed_experiment_in(CAMPAIGN_A, STUDENT_A1)
        for username, password in (STUDENT_A2, TEACHER, ADMIN):
            self.login(username, password)
            existing = self.client.get(
                f"/api/experiments/{experiment}/conditions"
            ).json()[0]
            condition = self.client.post(
                f"/api/experiments/{experiment}/conditions",
                json={
                    "role": "target",
                    "condition_name": "Injected condition",
                    "recipe_snapshot": existing["recipe_snapshot"],
                    "source_baseline_version_id": existing[
                        "source_baseline_version_id"
                    ],
                    "device_layout_code": existing["device_layout_code"],
                    "planned_substrate_count": 3,
                },
            )
            # Visible members (peer, manager, administrator) are all denied
            # the content write; only the owner authors.
            self.assertEqual(condition.status_code, 403, f"{username}: {condition.text}")
            self.assertIn("only the experiment owner", condition.json()["detail"])
            self.logout()

    def test_plan_status_owner_and_reviewer_split(self) -> None:
        experiment = self.seed_experiment_in(CAMPAIGN_A, STUDENT_A1)

        # The peer participant cannot even submit someone else's plan...
        self.login(*STUDENT_A2)
        denied = self.client.patch(
            f"/api/experiments/{experiment}/plan-status",
            json={"status": "pending_approval"},
        )
        self.assertEqual(denied.status_code, 403, denied.text)

        # ...the owner submits...
        self.logout()
        self.login(*STUDENT_A1)
        submitted = self.client.patch(
            f"/api/experiments/{experiment}/plan-status",
            json={"status": "pending_approval"},
        )
        self.assertEqual(submitted.status_code, 204, submitted.text)
        # ...but cannot self-approve.
        self_approval = self.client.patch(
            f"/api/experiments/{experiment}/plan-status",
            json={"status": "approved"},
        )
        self.assertEqual(self_approval.status_code, 403, self_approval.text)

        # The campaign manager approves with the digest...
        self.logout()
        self.login(*TEACHER)
        detail = self.client.get(f"/api/experiments/{experiment}").json()
        approved = self.client.patch(
            f"/api/experiments/{experiment}/plan-status",
            json={
                "status": "approved",
                "expected_approval_digest": detail["approval_scope_digest"],
            },
        )
        self.assertEqual(approved.status_code, 204, approved.text)
        released = self.client.patch(
            f"/api/experiments/{experiment}/plan-status",
            json={"status": "released"},
        )
        self.assertEqual(released.status_code, 204, released.text)

        # An instructor without membership reviews nothing (uniform 404).
        self.logout()
        self.login(*STUDENT_B)
        self.assertEqual(
            self.client.get(f"/api/experiments/{experiment}").status_code, 404
        )

    # ------------------------------------------------------------------
    # Membership management
    # ------------------------------------------------------------------

    def test_membership_management_boundaries(self) -> None:
        teacher_id = self.ids[TEACHER[0]]
        reader_id = self.ids[READER_A[0]]
        a2_id = self.ids[STUDENT_A2[0]]

        # The manager grants/changes reader and participant roles...
        self.login(*TEACHER)
        granted = self.client.put(
            f"/api/campaigns/{CAMPAIGN_A}/members/{reader_id}",
            json={"role": "participant"},
        )
        self.assertEqual(granted.status_code, 200, granted.text)
        self.assertEqual(granted.json()["role"], "participant")

        # ...cannot mint managers (no self-escalation)...
        promote = self.client.put(
            f"/api/campaigns/{CAMPAIGN_A}/members/{a2_id}",
            json={"role": "manager"},
        )
        self.assertEqual(promote.status_code, 403, promote.text)
        # ...and cannot remove a manager.
        demote = self.client.delete(
            f"/api/campaigns/{CAMPAIGN_A}/members/{teacher_id}"
        )
        self.assertEqual(demote.status_code, 403, demote.text)

        # Participants and outsiders manage nothing.
        self.logout()
        self.login(*STUDENT_A1)
        forbidden = self.client.put(
            f"/api/campaigns/{CAMPAIGN_A}/members/{reader_id}",
            json={"role": "reader"},
        )
        self.assertEqual(forbidden.status_code, 403, forbidden.text)
        self.logout()
        self.login(*OUTSIDER)
        invisible = self.client.get(f"/api/campaigns/{CAMPAIGN_A}/members")
        self.assertEqual(invisible.status_code, 404, invisible.text)

        # The administrator grants and removes managers; the last active
        # manager of a campaign is protected.
        self.logout()
        self.login(ADMIN[0], ADMIN[1])
        second_manager = self.client.put(
            f"/api/campaigns/{CAMPAIGN_A}/members/{a2_id}",
            json={"role": "manager"},
        )
        self.assertEqual(second_manager.status_code, 200, second_manager.text)
        removed = self.client.delete(
            f"/api/campaigns/{CAMPAIGN_A}/members/{a2_id}"
        )
        self.assertEqual(removed.status_code, 204, removed.text)
        # The administrator is campaign B's only manager (its creator);
        # removing the last manager of a campaign is refused.
        last = self.client.delete(
            f"/api/campaigns/{CAMPAIGN_B}/members/{self.ids[ADMIN[0]]}"
        )
        self.assertEqual(last.status_code, 409, last.text)
        # Campaign A still has the teacher and the administrator as
        # managers, so removing the teacher there would succeed — but the
        # earlier manager-protection assertions already covered the route
        # guard; nothing further to prove.
        del teacher_id

    def test_campaign_creation_makes_creator_manager(self) -> None:
        self.login(*TEACHER)
        created = self.client.post(
            "/api/campaigns",
            json={
                "code": "teacher-campaign",
                "display_name": "Teacher campaign",
                "description": "",
            },
        )
        self.assertEqual(created.status_code, 201, created.text)
        members = self.client.get("/api/campaigns/teacher-campaign/members")
        self.assertEqual(members.status_code, 200, members.text)
        self.assertEqual(
            [(m["user_id"], m["role"]) for m in members.json()],
            [(self.ids[TEACHER[0]], "manager")],
        )
        # The teacher immediately manages their own campaign.
        granted = self.client.put(
            f"/api/campaigns/teacher-campaign/members/{self.ids[STUDENT_A1[0]]}",
            json={"role": "participant"},
        )
        self.assertEqual(granted.status_code, 200, granted.text)

    def test_campaign_updates_require_manager_or_admin(self) -> None:
        self.login(*STUDENT_A1)
        denied = self.client.patch(
            f"/api/campaigns/{CAMPAIGN_A}", json={"description": "rewritten"}
        )
        self.assertEqual(denied.status_code, 403, denied.text)
        self.logout()
        self.login(*TEACHER)
        allowed = self.client.patch(
            f"/api/campaigns/{CAMPAIGN_A}", json={"description": "by manager"}
        )
        self.assertEqual(allowed.status_code, 200, allowed.text)
        # A member of another campaign treats this one as nonexistent.
        self.logout()
        self.login(*STUDENT_B)
        invisible = self.client.patch(
            f"/api/campaigns/{CAMPAIGN_A}", json={"description": "nope"}
        )
        self.assertEqual(invisible.status_code, 404, invisible.text)

    def test_revocation_applies_to_live_sessions_immediately(self) -> None:
        experiment = self.seed_experiment_in(CAMPAIGN_A, STUDENT_A1)
        self.login(*STUDENT_A1)
        self.assertEqual(
            self.client.get(f"/api/experiments/{experiment}").status_code, 200
        )
        # Revoke through the repository as an administrator would; the
        # already-authenticated session must observe it on the next request.
        asyncio.run(
            self.repository.remove_campaign_member(
                CAMPAIGN_A,
                self.ids[STUDENT_A1[0]],
                actor_user_id=self.ids[ADMIN[0]],
            )
        )
        self.assertEqual(
            self.client.get(f"/api/experiments/{experiment}").status_code, 404
        )
        self.assertEqual(self.client.get("/api/campaigns").json(), [])


def _minimal_recipe() -> dict:
    """Smallest accepted DepositionRecipe payload (no condition plans)."""
    from tests.test_web_app import VALID_RECIPE

    return VALID_RECIPE


if __name__ == "__main__":
    unittest.main()
