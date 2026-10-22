"""Synthetic booking contracts; PostgreSQL races live in test_booking_postgresql."""

import tempfile
import unittest
from datetime import timedelta, timezone
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from web import create_app
from web.audit_trail import utc_now
from web.booking_catalog import seed_equipment
from web.booking_models import (
    DEFAULT_UNITS,
    EquipmentUpdate,
    Interval,
    NoticeCreate,
    NoticeUpdate,
    ReservationAction,
    ReservationCreate,
    UsageUpdate,
    validate_fields,
    validate_units,
)
from web.database import Database, audit_events
from web.operations.booking import BookingOperations
from web.operations.errors import AccessDenied, StateConflict
from web.repository import UserRole, WebRepository
from web.repository.booking import reservation, usage_record, workflow_access


class BookingTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Database(Path(self.tmp.name) / "booking.sqlite", create_schema=True)
        await self.db.initialize()
        repo = WebRepository(self.db)
        self.accounts = {}
        for name, role in [
            ("admin", UserRole.ADMINISTRATOR),
            ("owner", UserRole.STUDENT),
            ("teacher", UserRole.INSTRUCTOR),
            ("manager", UserRole.STUDENT),
        ]:
            self.accounts[name] = await repo.create_user(
                username=name, display_name=name, password_hash="synthetic-unused-hash", role=role
            )
        self.admin = BookingOperations(self.db, self.accounts["admin"].id)
        self.owner = BookingOperations(self.db, self.accounts["owner"].id)
        self.teacher = BookingOperations(self.db, self.accounts["teacher"].id)
        self.manager = BookingOperations(self.db, self.accounts["manager"].id)
        await seed_equipment(self.db)
        self.equipment = await self.admin.list_equipment()
        self.eq = self.equipment[0]["id"]
        self.other_eq = self.equipment[1]["id"]
        await self.admin.update_equipment(
            self.eq, EquipmentUpdate(manager_id=self.accounts["manager"].id, bookable=True)
        )
        await self.admin.update_equipment(
            self.other_eq, EquipmentUpdate(manager_id=self.accounts["teacher"].id, bookable=True)
        )
        self.now = utc_now() + timedelta(days=1)
        self.clock = patch("web.operations.booking.utc_now", return_value=self.now)
        self.clock.start()

    async def asyncTearDown(self):
        self.clock.stop()
        await self.db.dispose()
        self.tmp.cleanup()

    async def book(self, op=None, eq=None, start=1, end=2, kind="booking", reason="", key=None):
        return await (op or self.owner).create_reservation(
            ReservationCreate(
                equipment_id=eq or self.eq,
                starts_at=self.now + timedelta(hours=start),
                ends_at=self.now + timedelta(hours=end),
                kind=kind,
                reason=reason,
                request_key=key or uuid4().hex,
            )
        )

    async def start(self, row):
        with patch(
            "web.operations.booking.utc_now", return_value=self.now + timedelta(hours=1, minutes=1)
        ):
            return await self.owner.action(row["id"], ReservationAction(action="start"))

    def glovebox(self):
        return dict(
            before_h2o=0,
            after_h2o=1.5,
            before_o2=2,
            after_o2=3,
            before_temperature=20,
            after_temperature=21,
        )

    async def test_catalogue_idempotency_and_no_startup_grants(self):
        await seed_equipment(self.db)
        await self.db.initialize()
        rows = await self.admin.list_equipment()
        self.assertEqual(len(rows), 20)
        self.assertEqual(sum(row["bookable"] for row in rows), 2)
        self.assertEqual({row["code"] for row in rows} & {"GB-7", "GB-8", "GB-9", "GB-10"}, set())
        self.assertEqual(next(row for row in rows if row["code"] == "ALD")["template"], "ald")
        async with self.db.engine.connect() as connection:
            self.assertEqual(
                await connection.scalar(select(func.count()).select_from(workflow_access)), 0
            )
        with self.assertRaises(StateConflict):
            await self.book(eq=rows[-1]["id"])

    async def test_overlap_adjacent_different_equipment_and_maintenance(self):
        await self.book()
        with self.assertRaises(StateConflict):
            await self.book(start=1.5, end=3)
        await self.book(start=2, end=3)
        await self.book(eq=self.other_eq)
        with self.assertRaises(StateConflict):
            await self.book(self.manager, kind="maintenance", reason="Service")

    async def test_cancel_release_and_no_show_free_slots(self):
        row = await self.book()
        await self.owner.action(row["id"], ReservationAction(action="cancel"))
        maintenance = await self.book(self.manager, kind="maintenance", reason="Service")
        await self.manager.action(
            maintenance["id"], ReservationAction(action="release", reason="Ready")
        )
        no_show = await self.book()
        later = self.now + timedelta(hours=3)
        with patch("web.operations.booking.utc_now", return_value=later):
            await self.manager.action(
                no_show["id"], ReservationAction(action="no_show", reason="Absent")
            )
        # The interval remains in the future relative to this test clock.
        await self.book()

    async def test_owner_manager_and_cross_equipment_boundaries(self):
        row = await self.book()
        with self.assertRaises(AccessDenied):
            await self.teacher.action(row["id"], ReservationAction(action="cancel", reason="No"))
        with self.assertRaises(AccessDenied):
            await self.teacher.get_usage(row["id"])
        with self.assertRaises(AccessDenied):
            await self.teacher.update_usage(row["id"], UsageUpdate(fields={}))
        with self.assertRaises(AccessDenied):
            await self.manager.update_equipment(self.other_eq, EquipmentUpdate(name="No"))
        with self.assertRaises(AccessDenied):
            await self.manager.update_equipment(
                self.eq, EquipmentUpdate(manager_id=self.accounts["teacher"].id)
            )
        with self.assertRaises(AccessDenied):
            await self.teacher.set_access(self.accounts["teacher"].id, True)
        with self.assertRaises(AccessDenied):
            await self.manager.action(row["id"], ReservationAction(action="start"))
        await self.manager.get_usage(row["id"])
        self.assertEqual(len(await self.teacher.ledger()), 0)
        self.assertEqual(len(await self.manager.ledger()), 1)

    async def test_cancellation_notifies_once_and_requires_reason(self):
        row = await self.book()
        with self.assertRaises(ValueError):
            await self.manager.action(row["id"], ReservationAction(action="cancel"))
        payload = ReservationAction(action="cancel", reason="Maintenance required")
        await self.manager.action(row["id"], payload)
        await self.manager.action(row["id"], payload)
        notifications = await self.owner.notifications()
        self.assertEqual(len(notifications), 1)
        self.assertEqual(notifications[0]["reservation_id"], row["id"])
        with self.assertRaises(KeyError):
            await self.teacher.notifications(notifications[0]["id"])
        self.assertIsNotNone((await self.owner.notifications(notifications[0]["id"]))["read_at"])

    async def test_completed_pending_then_submit_and_amend(self):
        row = await self.book()
        with self.assertRaises(StateConflict):
            await self.owner.action(row["id"], ReservationAction(action="start"))
        await self.owner.update_usage(row["id"], UsageUpdate(fields={"before_h2o": 0}))
        started = await self.start(row)
        with patch(
            "web.operations.booking.utc_now", return_value=self.now + timedelta(hours=1, minutes=30)
        ):
            ended = await self.owner.action(row["id"], ReservationAction(action="end"))
            repeated = await self.owner.action(row["id"], ReservationAction(action="end"))
        self.assertEqual(ended, repeated)
        self.assertEqual(ended["status"], "completed")
        self.assertIsNotNone(ended["actual_end"])
        self.assertEqual(ended["starts_at"], started["starts_at"])
        self.assertEqual(ended["ends_at"], started["ends_at"])
        self.assertEqual(len(await self.manager.ledger(pending=True)), 1)
        await self.owner.update_usage(row["id"], UsageUpdate(fields=self.glovebox(), submit=True))
        self.assertEqual(await self.owner.ledger(pending=True), [])
        await self.owner.update_usage(
            row["id"], UsageUpdate(fields=self.glovebox() | {"after_o2": 4}, submit=True)
        )
        async with self.db.engine.connect() as connection:
            self.assertEqual(
                await connection.scalar(select(func.count()).select_from(usage_record)), 1
            )
            self.assertEqual(
                await connection.scalar(
                    select(func.count())
                    .select_from(audit_events)
                    .where(audit_events.c.action == "usage.amend")
                ),
                1,
            )
        for action in ("start", "cancel"):
            with self.assertRaises(StateConflict):
                await self.owner.action(row["id"], ReservationAction(action=action, reason="No"))
        with self.assertRaises(StateConflict):
            await self.book()  # Completion retains the original time slot.

    async def test_submit_and_end_validation_is_atomic(self):
        row = await self.book()
        await self.start(row)
        with self.assertRaises(ValueError):
            await self.owner.action(
                row["id"], ReservationAction(action="submit_and_end", fields={})
            )
        async with self.db.engine.connect() as connection:
            self.assertEqual(
                await connection.scalar(
                    select(reservation.c.status).where(reservation.c.id == row["id"])
                ),
                "in_use",
            )
        with patch(
            "web.operations.booking.utc_now", return_value=self.now + timedelta(hours=1, minutes=30)
        ):
            result = await self.owner.action(
                row["id"], ReservationAction(action="submit_and_end", fields=self.glovebox())
            )
        self.assertEqual(result["status"], "completed")
        self.assertEqual((await self.owner.get_usage(row["id"]))["status"], "submitted")

    async def test_overrun_blocks_next_start_until_manager_force_end(self):
        row = await self.book()
        await self.start(row)
        next_row = await self.book(start=2, end=3)
        with patch(
            "web.operations.booking.utc_now", return_value=self.now + timedelta(hours=2, minutes=1)
        ):
            with self.assertRaisesRegex(StateConflict, "remains in use"):
                await self.owner.action(next_row["id"], ReservationAction(action="start"))
            await self.manager.action(
                row["id"], ReservationAction(action="force_end", reason="User forgot to end")
            )
            result = await self.owner.action(next_row["id"], ReservationAction(action="start"))
            self.assertEqual(result["status"], "in_use")

    async def test_timezone_offset_round_trip_and_calendar(self):
        zone = timezone(timedelta(hours=8))
        start = (self.now + timedelta(hours=1)).astimezone(zone)
        end = (self.now + timedelta(hours=2)).astimezone(zone)
        row = await self.owner.create_reservation(
            ReservationCreate(
                equipment_id=self.eq,
                starts_at=start.isoformat(),
                ends_at=end.isoformat(),
                request_key=uuid4().hex,
            )
        )
        self.assertEqual(row["starts_at"], start)
        self.assertEqual(row["ends_at"], end)
        rows = await self.owner.calendar(start, end)
        self.assertEqual([item["id"] for item in rows], [row["id"]])

    async def test_snapshot_survives_configuration_change(self):
        row = await self.book()
        await self.admin.update_equipment(
            self.eq, EquipmentUpdate(template="ald", units=DEFAULT_UNITS["ald"])
        )
        usage = await self.owner.get_usage(row["id"])
        self.assertEqual(usage["template"], "glovebox")
        self.assertEqual(usage["units"], DEFAULT_UNITS["glovebox"])
        self.assertEqual(usage["template_version"], 1)

    async def test_reschedule_and_retry_keys(self):
        row = await self.book(key="same-key-123")
        again = await self.book(key="same-key-123")
        self.assertEqual(row["id"], again["id"])
        with self.assertRaises(StateConflict):
            await self.book(key="same-key-123", end=3)
        await self.book(start=3, end=4)
        with self.assertRaises(StateConflict):
            await self.owner.reschedule(
                row["id"],
                Interval(
                    starts_at=self.now + timedelta(hours=2), ends_at=self.now + timedelta(hours=4)
                ),
            )
        await self.owner.reschedule(
            row["id"],
            Interval(
                starts_at=self.now + timedelta(hours=2), ends_at=self.now + timedelta(hours=3)
            ),
        )
        with self.assertRaises(ValueError):
            await self.book(start=-1, end=0)

    async def test_notices_filter_expiry_withdraw_and_dedup(self):
        await self.book()
        await self.book(start=2, end=3)
        payload = NoticeCreate(
            equipment_id=self.eq,
            body="停机 / Service",
            pinned=True,
            valid_from=self.now,
            valid_until=self.now + timedelta(days=2),
            notify_until=self.now + timedelta(days=1),
            request_key=uuid4().hex,
        )
        notice = await self.manager.create_notice(payload)
        self.assertEqual((await self.manager.create_notice(payload))["id"], notice["id"])
        self.assertEqual(len(await self.owner.notifications()), 1)
        self.assertEqual((await self.owner.list_notices())[0]["body"], "停机 / Service")
        self.assertEqual(await self.owner.list_notices(self.other_eq), [])
        with patch("web.operations.booking.utc_now", return_value=self.now + timedelta(days=3)):
            self.assertEqual(await self.owner.list_notices(), [])
        with self.assertRaises(AccessDenied):
            await self.teacher.update_notice(notice["id"], NoticeUpdate(withdraw=True))
        await self.manager.update_notice(notice["id"], NoticeUpdate(withdraw=True))
        self.assertEqual(await self.owner.list_notices(), [])

    async def test_notice_history_is_scoped_and_scheduled_notices_remain_manageable(self):
        payload = NoticeCreate(
            equipment_id=self.eq,
            body="Synthetic future notice",
            valid_from=self.now + timedelta(days=1),
            valid_until=self.now + timedelta(days=2),
            request_key=uuid4().hex,
        )
        notice = await self.manager.create_notice(payload)
        self.assertEqual(await self.owner.list_notices(), [])
        self.assertEqual((await self.manager.list_notices(history=True))[0]["id"], notice["id"])
        self.assertEqual(await self.teacher.list_notices(history=True), [])
        with self.assertRaises(AccessDenied):
            await self.owner.list_notices(history=True)
        with self.assertRaises(AccessDenied):
            await self.teacher.list_notices(self.eq, history=True)
        with self.assertRaises(AccessDenied):
            await self.owner.notice_detail(notice["id"])
        self.assertEqual((await self.manager.notice_detail(notice["id"]))["body"], payload.body)
        self.assertEqual(len(await self.admin.list_notices(history=True)), 1)
        await self.manager.update_notice(notice["id"], NoticeUpdate(withdraw=True))
        self.assertIsNotNone((await self.manager.list_notices(history=True))[0]["withdrawn_at"])

    async def test_notified_recipient_can_read_original_notice_after_withdrawal(self):
        await self.book()
        notice = await self.manager.create_notice(NoticeCreate(
            equipment_id=self.eq, body="Original synthetic outage message",
            valid_from=self.now, valid_until=self.now + timedelta(days=2),
            notify_until=self.now + timedelta(days=1), request_key=uuid4().hex,
        ))
        await self.manager.update_notice(notice["id"], NoticeUpdate(withdraw=True))
        self.assertEqual(await self.owner.list_notices(), [])
        self.assertEqual((await self.owner.notice_detail(notice["id"]))["body"], notice["body"])
        with self.assertRaises(AccessDenied):
            await self.teacher.notice_detail(notice["id"])
        with self.assertRaises(AccessDenied):
            await self.owner.list_notices(history=True)

    async def test_manager_deactivation_pauses_equipment(self):
        await WebRepository(self.db).update_user(
            self.accounts["manager"].id,
            role=UserRole.STUDENT,
            is_active=False,
            actor_user_id=self.accounts["admin"].id,
            client_ip=None,
        )
        rows = await self.admin.list_equipment()
        self.assertFalse(next(row for row in rows if row["id"] == self.eq)["bookable"])
        with self.assertRaises(StateConflict):
            await self.book()


class TemplateValidationTests(unittest.TestCase):
    def test_units_and_timezone_contract(self):
        for template, units in [
            ("glovebox", {"water_oxygen": "ppm"}),
            ("ald", DEFAULT_UNITS["ald"] | {"pressure": "guess"}),
            ("evaporation", DEFAULT_UNITS["evaporation"] | {"thickness": "cm"}),
        ]:
            with self.subTest(template=template), self.assertRaises(ValueError):
                validate_units(template, units)
        self.assertEqual(
            validate_units("ald", DEFAULT_UNITS["ald"] | {"pressure": "mbar"})["pressure"], "mbar"
        )
        for start in ("2026-10-23T12:00:00", "1792756800", 1792756800):
            with self.subTest(start=start), self.assertRaises(ValueError):
                Interval(starts_at=start, ends_at="2026-10-24T12:00:00+08:00")
        Interval(starts_at="2026-10-23T12:00:00+08:00", ends_at="2026-10-23T05:00:00Z")

    def test_types_finite_values_and_separate_water_oxygen(self):
        for fields in (
            {"before_h2o": -1},
            {"before_o2": -1},
            {"before_h2o": "1"},
            {"before_h2o": True},
            {"before_h2o": float("nan")},
            {"before_temperature": float("inf")},
            {"water_oxygen": 1},
        ):
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                validate_fields("glovebox", 1, fields, submit=False)
        for cycles in (0, -1, True, 1.2, "3"):
            with self.subTest(cycles=cycles), self.assertRaises(ValueError):
                validate_fields("ald", 1, {"cycles": cycles}, submit=False)
        self.assertEqual(
            validate_fields(
                "ald",
                1,
                {
                    "material": "Al2O3",
                    "cycles": 1,
                    "initial_temperature": 25,
                    "chamber_pressure": 0.1,
                },
                submit=True,
            )["cycles"],
            1,
        )
        self.assertEqual(
            validate_fields(
                "evaporation",
                1,
                {
                    "layers": [{"material": "Ag", "thickness": 100}],
                    "vacuum": 0.001,
                    "initial_temperature": 20,
                },
                submit=True,
            )["layers"][0]["material"],
            "Ag",
        )
        with self.assertRaises(ValueError):
            validate_fields("general", 1, {"usage": " "}, submit=True)


class WorkflowBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.app = create_app(
            Path(self.tmp.name) / "auth.sqlite",
            secure_cookies=False,
            _test_user=("booking-admin", "Synthetic administrator secret", UserRole.ADMINISTRATOR),
        )
        self.context = TestClient(self.app)
        self.client = self.context.__enter__()
        self.login("booking-admin", "Synthetic administrator secret")

    def tearDown(self):
        self.context.__exit__(None, None, None)
        self.tmp.cleanup()

    def login(self, name, password):
        token = self.client.get("/api/auth/login-csrf").json()["login_csrf_token"]
        result = self.client.post(
            "/api/auth/login", json={"username": name, "password": password, "login_csrf": token}
        )
        self.assertEqual(result.status_code, 200, result.text)
        self.client.headers["X-CSRF-Token"] = self.client.cookies.get("perovskite_csrf")

    def create(self, name, role):
        response = self.client.post(
            "/api/users",
            json={
                "username": name,
                "display_name": name,
                "role": role,
                "password": "Synthetic booking account secret",
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def test_new_students_teachers_and_managers_have_no_workflow_access(self):
        for role in ("student", "instructor", "administrator"):
            with self.subTest(role=role):
                self.login("booking-admin", "Synthetic administrator secret")
                identity = self.create(f"new-{role}", role)
                if role == "student":
                    self.client.portal.call(seed_equipment, self.app.state.database)
                    eq = self.client.get("/api/booking/equipment").json()[0]
                    self.assertEqual(
                        self.client.patch(
                            f"/api/booking/equipment/{eq['id']}",
                            json={"manager_id": identity, "bookable": True},
                        ).status_code,
                        200,
                    )
                self.login(f"new-{role}", "Synthetic booking account secret")
                self.assertFalse(self.client.get("/api/session").json()["workflow_access"])
                self.assertEqual(self.client.get("/api/booking/equipment").status_code, 200)
                for method, url in [
                    ("get", "/api/experiments"),
                    ("post", "/api/experiments"),
                    ("get", "/api/results"),
                    ("get", "/api/fabrication-batches"),
                    ("get", "/api/analysis/jv-overlay"),
                    ("get", "/api/campaigns"),
                    ("get", "/experiments/1/export.json"),
                    ("get", "/experiments/1/export.pdf"),
                    ("get", "/api/results/1/figures/jv"),
                ]:
                    response = getattr(self.client, method)(url)
                    self.assertEqual(response.status_code, 403, response.text)
                if role != "administrator":
                    self.assertEqual(
                        self.client.put(
                            f"/api/booking/workflow-access/{identity}", json={"enabled": True}
                        ).status_code,
                        403,
                    )

    def test_grant_revoke_same_session_and_csrf(self):
        identity = self.create("booking-teacher", "instructor")
        self.assertEqual(
            self.client.put(
                f"/api/booking/workflow-access/{identity}", json={"enabled": True}
            ).status_code,
            200,
        )
        self.login("booking-teacher", "Synthetic booking account secret")
        self.assertEqual(self.client.get("/api/experiments").status_code, 200)
        token = self.client.cookies.get("perovskite_session")
        op = BookingOperations(self.app.state.database, 1)
        self.client.portal.call(op.set_access, identity, False)
        self.assertEqual(self.client.cookies.get("perovskite_session"), token)
        self.assertEqual(self.client.get("/api/experiments").status_code, 403)
        self.assertEqual(self.client.get("/api/session").status_code, 200)
        self.assertEqual(self.client.get("/api/booking/notifications").status_code, 200)
        self.client.headers.pop("X-CSRF-Token")
        self.assertEqual(self.client.post("/api/booking/notifications/1/read").status_code, 403)

    def test_booking_api_conflicts_validation_and_end_later(self):
        self.client.portal.call(seed_equipment, self.app.state.database)
        eq = self.client.get("/api/booking/equipment").json()[0]
        identity = self.client.get("/api/session").json()["id"]
        base = "/api/booking"
        self.assertEqual(
            self.client.patch(
                f"{base}/equipment/{eq['id']}", json={"manager_id": identity, "bookable": True}
            ).status_code,
            200,
        )
        now = utc_now()
        payload = dict(
            equipment_id=eq["id"],
            starts_at=(now + timedelta(hours=1)).isoformat(),
            ends_at=(now + timedelta(hours=2)).isoformat(),
            request_key=uuid4().hex,
        )
        created = self.client.post(f"{base}/reservations", json=payload)
        self.assertEqual(created.status_code, 201, created.text)
        row = created.json()
        self.assertTrue(row["starts_at"].endswith("Z"))
        self.assertEqual(
            self.client.post(
                f"{base}/reservations", json=payload | {"request_key": uuid4().hex}
            ).status_code,
            409,
        )
        self.assertEqual(
            self.client.post(
                f"{base}/reservations", json=payload | {"starts_at": "2026-10-23T08:00:00"}
            ).status_code,
            422,
        )
        with patch(
            "web.operations.booking.utc_now", return_value=now + timedelta(hours=1, minutes=1)
        ):
            response = self.client.post(
                f"{base}/reservations/{row['id']}/actions", json={"action": "start"}
            )
            self.assertEqual(response.status_code, 200, response.text)
        with patch(
            "web.operations.booking.utc_now", return_value=now + timedelta(hours=1, minutes=30)
        ):
            invalid = self.client.post(
                f"{base}/reservations/{row['id']}/actions",
                json={"action": "submit_and_end", "fields": {}},
            )
            self.assertEqual(invalid.status_code, 422, invalid.text)
            ended = self.client.post(
                f"{base}/reservations/{row['id']}/actions", json={"action": "end"}
            )
            self.assertEqual(ended.status_code, 200, ended.text)
            self.assertEqual(ended.json()["status"], "completed")
        pending = self.client.get(f"{base}/ledger", params={"pending": "true"})
        self.assertEqual(pending.status_code, 200, pending.text)
        self.assertEqual(len(pending.json()), 1)
        self.assertEqual(pending.json()[0]["status"], "draft")

    def test_all_booking_mutations_have_csrf_dependency(self):
        from web.auth import require_csrf
        from web.routes.booking import create_booking_router

        for route in create_booking_router().routes:
            if route.methods & {"POST", "PUT", "PATCH", "DELETE"}:
                self.assertIn(
                    require_csrf, [dep.call for dep in route.dependant.dependencies], route.path
                )

    def test_every_fabrication_route_has_the_module_guard(self):
        from web.auth import require_workflow_access
        from web.routes import create_router

        router = create_router(self.app.state.repository, default_campaign_id=None)
        routes = []
        for route in router.routes:
            if hasattr(route, "effective_route_contexts"):
                routes.extend(route.effective_route_contexts())
            elif isinstance(route, APIRoute):
                routes.append(route)
        self.assertGreater(len(routes), 50)
        for route in routes:
            self.assertIn(
                require_workflow_access,
                [item.call for item in route.dependant.dependencies],
                route.path,
            )


if __name__ == "__main__":
    unittest.main()
