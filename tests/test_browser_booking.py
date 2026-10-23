"""Synthetic, real-Chrome acceptance of the shipped booking application.

No production accounts or experimental records are used. Independent PostgreSQL
constraint races remain in test_booking_postgresql; these tests exercise React,
the real HTTP API, cookies/CSRF, the production CSP and persisted SQLite data.
"""

from __future__ import annotations

import asyncio
import json
import subprocess
import tempfile
import threading
import time
import unittest
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

import httpx2 as httpx
import uvicorn
from fastapi.testclient import TestClient
from sqlalchemy import update

from tests.cdp_driver import (
    click_center,
    evaluate,
    launch_chrome_with_viewport,
    wait_for_expression,
)
from tests.test_browser_builder import available_port, should_skip_browser_tests
from web import create_app
from web.audit_trail import utc_now
from web.booking_catalog import seed_equipment
from web.repository import UserRole
from web.repository.booking import reservation

PASSWORD = "Synthetic booking password 2026!"


def login(client, username):
    token = client.get("/api/auth/login-csrf").json()["login_csrf_token"]
    response = client.post(
        "/api/auth/login",
        json={
            "username": username,
            "password": PASSWORD,
            "login_csrf": token,
        },
    )
    assert response.status_code == 200, response.text
    client.headers["X-CSRF-Token"] = client.cookies.get("perovskite_csrf")


@unittest.skipIf(should_skip_browser_tests(), "real Chrome is not available or explicitly disabled")
class BookingBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        cls.app = create_app(
            Path(cls.directory.name) / "booking.sqlite",
            secure_cookies=False,
            _test_user=("booking-admin", PASSWORD, UserRole.ADMINISTRATOR),
        )
        cls.ids = {}
        with TestClient(cls.app) as client:
            login(client, "booking-admin")
            asyncio.run(seed_equipment(cls.app.state.database))
            for name, role in [
                ("owner", "student"),
                ("manager", "student"),
                ("teacher", "instructor"),
                ("other", "student"),
            ]:
                response = client.post(
                    "/api/users",
                    json={
                        "username": f"booking-{name}",
                        "display_name": f"Synthetic {name}",
                        "password": PASSWORD,
                        "role": role,
                    },
                )
                assert response.status_code == 201, response.text
                cls.ids[name] = response.json()["id"]
            cls.equipment = client.get("/api/booking/equipment").json()
            for eq in cls.equipment:
                manager = cls.ids["teacher"] if eq["code"] == "CVD" else cls.ids["manager"]
                response = client.patch(
                    f"/api/booking/equipment/{eq['id']}",
                    json={
                        "manager_id": manager,
                        "bookable": True,
                    },
                )
                assert response.status_code == 200, response.text
            cls.ald_id = next(eq["id"] for eq in cls.equipment if eq["code"] == "ALD")
            login(client, "booking-other")
            cls.now = utc_now()
            cls.manager_rows = []
            for hour in (24, 26, 28):
                response = client.post(
                    "/api/booking/reservations",
                    json={
                        "equipment_id": cls.ald_id,
                        "request_key": uuid4().hex,
                        "starts_at": (cls.now + timedelta(hours=hour)).isoformat(),
                        "ends_at": (cls.now + timedelta(hours=hour + 1)).isoformat(),
                    },
                )
                assert response.status_code == 201, response.text
                cls.manager_rows.append(response.json()["id"])

            async def past_fixtures():
                # Test-fixture clock control only: real requests never allow past bookings.
                async with cls.app.state.database.begin() as connection:
                    await connection.execute(
                        update(reservation)
                        .where(reservation.c.id == cls.manager_rows[1])
                        .values(
                            starts_at=cls.now - timedelta(hours=4),
                            ends_at=cls.now - timedelta(hours=3),
                        )
                    )
                    await connection.execute(
                        update(reservation)
                        .where(reservation.c.id == cls.manager_rows[2])
                        .values(
                            starts_at=cls.now - timedelta(hours=2),
                            ends_at=cls.now - timedelta(hours=1),
                            status="in_use",
                            actual_start=cls.now - timedelta(hours=2),
                        )
                    )

            asyncio.run(past_fixtures())
        cls.port = available_port()
        cls.base = f"http://127.0.0.1:{cls.port}"
        cls.server = uvicorn.Server(
            uvicorn.Config(cls.app, host="127.0.0.1", port=cls.port, log_level="error")
        )
        cls.thread = threading.Thread(target=cls.server.run, daemon=True)
        cls.thread.start()
        deadline = time.monotonic() + 15
        while not cls.server.started and time.monotonic() < deadline:
            time.sleep(0.05)
        if not cls.server.started:
            raise RuntimeError("booking acceptance server failed to start")

    @classmethod
    def tearDownClass(cls):
        cls.server.should_exit = True
        cls.thread.join(timeout=5)
        cls.directory.cleanup()

    def open_browser(self, name, width=1440):
        process, session = launch_chrome_with_viewport(
            self.base + "/app/login",
            width=width,
            height=1000,
            user_data_dir=str(Path(self.directory.name) / f"chrome-{name}"),
        )
        self.addCleanup(self.close_browser, process, session)
        wait_for_expression(session, "Boolean(document.querySelector('#login-username'))")
        evaluate(session, "localStorage.setItem('perovskite.ui.language','en');location.reload()")
        wait_for_expression(session, "Boolean(document.querySelector('#login-username'))")
        self.set_value(session, "document.querySelector('#login-username')", f"booking-{name}")
        self.set_value(session, "document.querySelector('#login-password')", PASSWORD)
        self.click(session, "document.querySelector('.login-card button[type=submit]')")
        wait_for_expression(
            session,
            "Boolean(document.querySelector('.booking-page, .pipeline-header, .overview-page')) || !location.pathname.includes('login')",
        )
        return session

    @staticmethod
    def close_browser(process, session):
        session.close()
        process.kill()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pass

    @staticmethod
    def button(label, scope="document"):
        return f"Array.from({scope}.querySelectorAll('button')).find(e=>e.textContent.trim()==={json.dumps(label)})"

    @staticmethod
    def field(label):
        return f"Array.from(document.querySelectorAll('label')).find(e=>e.textContent.trim().startsWith({json.dumps(label)}))?.querySelector('input,textarea,select')"

    def click(self, session, expression):
        wait_for_expression(session, f"Boolean(({expression}) && !({expression}).disabled)")
        click_center(session, expression)

    @staticmethod
    def set_value(session, expression, value):
        wait_for_expression(session, f"Boolean({expression})")
        evaluate(
            session,
            f"""(()=>{{const e=({expression});const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(p,'value').set.call(e,{json.dumps(value)});
            e.dispatchEvent(new Event('input',{{bubbles:true}}));e.dispatchEvent(new Event('change',{{bubbles:true}}));}})()""",
        )

    def navigate(self, session, path):
        evaluate(session, f"location.href={json.dumps(self.base + path)}")
        wait_for_expression(session, "Boolean(document.querySelector('.booking-page'))")

    def assert_no_overflow(self, session):
        self.assertFalse(
            evaluate(
                session, "document.documentElement.scrollWidth>document.documentElement.clientWidth"
            )
        )

    def test_owner_calendar_booking_end_later_and_bilingual_ledger_at_320px(self):
        session = self.open_browser("owner", width=320)
        wait_for_expression(
            session, "document.querySelectorAll('.booking-equipment-option').length===20"
        )
        self.assertEqual(evaluate(session, "location.pathname"), "/app/booking")
        self.assertFalse(
            evaluate(session, "Boolean(document.querySelector('a[href=\"/app/experiments\"]'))")
        )
        self.assert_no_overflow(session)
        self.click(session, self.button("New booking"))
        start = utc_now() + timedelta(hours=1)
        start_input = (start + timedelta(hours=8)).strftime("%Y-%m-%dT%H:%M")
        end_input = (start + timedelta(hours=9)).strftime("%Y-%m-%dT%H:%M")
        self.set_value(session, self.field("Start (Shanghai time)"), start_input)
        self.set_value(session, self.field("End (Shanghai time)"), end_input)
        self.click(session, self.button("中文", "document.querySelector('[role=dialog]')"))
        self.assertEqual(
            evaluate(
                session, "document.querySelector('[role=dialog] input[type=datetime-local]').value"
            ),
            start_input,
        )
        self.click(session, self.button("English", "document.querySelector('[role=dialog]')"))
        self.click(session, self.button("Book equipment"))
        wait_for_expression(session, "!document.querySelector('[role=dialog]')")
        self.click(session, self.button("Month"))
        wait_for_expression(session, "document.querySelectorAll('.booking-month__day').length===42")
        self.assert_no_overflow(session)
        self.click(
            session,
            f"document.querySelector('.booking-month__day[aria-label^=\"{start_input[:10]}\"]')",
        )
        wait_for_expression(
            session, "document.querySelectorAll('.booking-timeline__heading').length===20"
        )
        self.assert_no_overflow(session)
        self.click(session, self.button("Clear selection"))
        wait_for_expression(session, "!document.querySelector('.booking-timeline')")
        self.click(
            session,
            "Array.from(document.querySelectorAll('.booking-equipment-option')).find(e=>e.textContent.trim().startsWith('GB-1 ')).querySelector('input')",
        )
        wait_for_expression(
            session, "document.querySelectorAll('.booking-timeline__heading').length===1"
        )
        self.click(session, self.button("Week"))
        wait_for_expression(
            session, "document.querySelectorAll('.booking-timeline__heading').length===7"
        )
        self.assertEqual(
            evaluate(
                session,
                "document.querySelectorAll('.booking-equipment-option input:checked').length",
            ),
            1,
        )
        with httpx.Client(base_url=self.base) as client:
            login(client, "booking-owner")
            records = client.get("/api/booking/ledger").json()
            identity = records[0]["reservation_id"]
            detail = client.get(f"/api/booking/reservations/{identity}").json()
            self.assertEqual(
                detail["starts_at"],
                start.replace(second=0, microsecond=0).isoformat().replace("+00:00", "Z"),
            )

        async def current_fixture():
            async with self.app.state.database.begin() as connection:
                await connection.execute(
                    update(reservation)
                    .where(reservation.c.id == identity)
                    .values(starts_at=utc_now() - timedelta(minutes=1))
                )

        asyncio.run(current_fixture())
        self.navigate(session, "/app/booking")
        self.click(session, self.button("My usage records"))
        self.click(session, "document.querySelector('.booking-record')")
        self.click(session, self.button("Start use"))
        self.click(session, self.button("End use, fill in later"))
        wait_for_expression(session, f"Boolean({self.button('Submit usage record')})")
        with httpx.Client(base_url=self.base) as client:
            login(client, "booking-owner")
            ended = client.get(f"/api/booking/reservations/{identity}").json()
            self.assertEqual(ended["status"], "completed")
            self.assertIsNotNone(ended["actual_end"])
            pending = client.get("/api/booking/ledger?pending=true").json()
            self.assertEqual([item["reservation_id"] for item in pending], [identity])
            self.assertEqual(pending[0]["status"], "draft")
        for label, value in [
            ("H₂O before use", "0.1"),
            ("H₂O after use", "0.2"),
            ("O₂ before use", "0.3"),
            ("O₂ after use", "0.4"),
            ("Temperature before use", "23"),
            ("Temperature after use", "24"),
        ]:
            self.set_value(session, self.field(label), value)
        self.click(session, self.button("Submit usage record"))
        wait_for_expression(
            session, "document.querySelector('.booking-usage h3').textContent.includes('Submitted')"
        )
        self.assert_no_overflow(session)
        with httpx.Client(base_url=self.base) as client:
            login(client, "booking-owner")
            res = client.get(f"/api/booking/reservations/{identity}").json()
            ledger = client.get(f"/api/booking/reservations/{identity}/usage").json()
            self.assertEqual(res["status"], "completed")
            self.assertIsNotNone(res["actual_end"])
            self.assertEqual(ledger["fields"]["before_h2o"], 0.1)
            self.assertEqual(ledger["fields"]["after_o2"], 0.4)
            self.assertEqual(ledger["status"], "submitted")
            self.assertEqual(client.get("/api/booking/ledger?pending=true").json(), [])
        session.check_errors()

    def test_manager_actions_notice_history_and_recipient_inbox(self):
        session = self.open_browser("manager")
        self.navigate(session, "/app/booking/manage")
        wait_for_expression(session, "Boolean(document.querySelector('.booking-equipment-editor'))")
        self.assertFalse(
            evaluate(session, f"Boolean({self.button('Fabrication workflow access')})")
        )
        self.assertFalse(
            evaluate(
                session,
                "Array.from(document.querySelectorAll('.booking-managed-select option')).some(e=>e.textContent.startsWith('CVD'))",
            )
        )
        self.set_value(
            session, "document.querySelector('.booking-managed-select select')", str(self.ald_id)
        )
        self.click(session, self.button("Reservations and maintenance"))
        for identity, action in zip(
            self.manager_rows,
            ("Cancel with reason", "Mark no-show", "End use on behalf of owner"),
            strict=True,
        ):
            self.click(
                session,
                f"Array.from(document.querySelectorAll('.booking-record')).find(e=>e.dataset.reservationId==={json.dumps(str(identity))})",
            )
            wait_for_expression(
                session, "Boolean(document.querySelector('.booking-manager-action'))"
            )
            self.assertTrue(evaluate(session, f"({self.button(action)}).disabled"))
            self.set_value(session, self.field("Reason"), "Synthetic acceptance reason")
            self.click(session, self.button(action))
            wait_for_expression(session, "!document.querySelector('.booking-manager-action')")
            self.click(session, self.button("Close", "document.querySelector('[role=dialog]')"))
        self.click(session, self.button("Create maintenance block"))
        self.set_value(session, self.field("Reason"), "Synthetic maintenance")
        self.click(
            session,
            self.button("Create maintenance block", "document.querySelector('[role=dialog]')"),
        )
        wait_for_expression(session, "!document.querySelector('[role=dialog]')")
        self.click(
            session,
            "Array.from(document.querySelectorAll('.booking-record')).find(e=>e.textContent.includes('Maintenance'))",
        )
        self.set_value(session, self.field("Reason"), "Synthetic release")
        self.click(session, self.button("Release maintenance"))
        wait_for_expression(session, "!document.querySelector('.booking-manager-action')")
        self.click(session, self.button("Close", "document.querySelector('[role=dialog]')"))
        self.click(session, self.button("Equipment notices"))
        self.click(session, self.button("Publish notice"))
        self.set_value(session, self.field("Notice body"), "Synthetic bilingual outage · 合成公告")
        self.click(
            session, self.button("Publish notice", "document.querySelector('[role=dialog]')")
        )
        wait_for_expression(session, "!document.querySelector('[role=dialog]')")
        self.click(session, self.button("Pin"))
        self.click(session, self.button("Unpin"))
        self.click(session, self.button("Withdraw"))
        wait_for_expression(
            session, "document.querySelector('.booking-notice').textContent.includes('Withdrawn')"
        )
        with httpx.Client(base_url=self.base) as client:
            login(client, "booking-other")
            notifications = client.get("/api/booking/notifications").json()
            self.assertEqual(len(notifications), 1)
            item = notifications[0]
            self.assertEqual(item["reservation_id"], self.manager_rows[0])
            first = client.post(f"/api/booking/notifications/{item['id']}/read").json()
            second = client.post(f"/api/booking/notifications/{item['id']}/read").json()
            self.assertEqual(first["read_at"], second["read_at"])
            self.assertEqual(
                client.get(f"/api/booking/reservations/{self.manager_rows[1]}").json()["status"],
                "no_show",
            )
            forced = client.get(f"/api/booking/reservations/{self.manager_rows[2]}/usage").json()
            self.assertEqual(forced["fields"], {})
            self.assertEqual(forced["status"], "draft")
        session.check_errors()

    def test_admin_workflow_grant_and_live_session_revocation(self):
        session = self.open_browser("admin")
        self.navigate(session, "/app/booking/manage")
        self.click(session, self.button("Fabrication workflow access"))
        teacher_row = "Array.from(document.querySelectorAll('.booking-access-row')).find(e=>e.textContent.includes('booking-teacher'))"
        with httpx.Client(base_url=self.base) as client:
            login(client, "booking-teacher")
            self.assertFalse(client.get("/api/session").json()["workflow_access"])
            self.assertEqual(client.get("/api/experiments").status_code, 403)
            self.click(session, f"{teacher_row}.querySelector('button')")
            wait_for_expression(
                session, f"{teacher_row}.textContent.includes('Revoke fabrication access')"
            )
            self.assertTrue(client.get("/api/session").json()["workflow_access"])
            self.assertEqual(client.get("/api/experiments").status_code, 200)
            self.click(session, f"{teacher_row}.querySelector('button')")
            wait_for_expression(
                session, f"{teacher_row}.textContent.includes('Grant fabrication access')"
            )
            self.assertFalse(client.get("/api/session").json()["workflow_access"])
            self.assertEqual(client.get("/api/experiments").status_code, 403)
            self.assertEqual(client.get("/api/booking/equipment").status_code, 200)
        session.check_errors()


if __name__ == "__main__":
    unittest.main()
