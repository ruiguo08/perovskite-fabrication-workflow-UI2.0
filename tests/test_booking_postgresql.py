"""Real PostgreSQL transactions: exclusion, in-use uniqueness and Alembic."""

import asyncio
import os
import unittest
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from alembic import command
from alembic.config import Config
from sqlalchemy import func, insert, select, text, update
from sqlalchemy.exc import DBAPIError, IntegrityError

from web.audit_trail import utc_now
from web.booking_catalog import seed_equipment
from web.booking_models import ReservationAction, ReservationCreate
from web.database import Database, users
from web.operations.booking import BookingOperations
from web.operations.errors import StateConflict
from web.repository import UserRole, WebRepository
from web.repository.booking import (
    BookingStore,
    equipment,
    reservation,
    usage_record,
    workflow_access,
)


@unittest.skipUnless(
    os.environ.get("PEROVSKITE_TEST_POSTGRESQL_URL"),
    "requires real PostgreSQL via PEROVSKITE_TEST_POSTGRESQL_URL",
)
class PostgreSQLBookingTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.db = Database(os.environ["PEROVSKITE_TEST_POSTGRESQL_URL"])
        self.suffix = uuid4().hex[:12]
        self.user = await WebRepository(self.db).create_user(
            username=f"booking-{self.suffix}",
            display_name="Synthetic booking user",
            password_hash="unused-synthetic-test-hash",
            role=UserRole.ADMINISTRATOR,
        )
        self.op = BookingOperations(self.db, self.user.id)
        self.now = utc_now() + timedelta(days=3)
        async with self.db.begin() as connection:
            self.eq = (
                await connection.execute(
                    insert(equipment)
                    .values(
                        code=f"T-{self.suffix}",
                        name="Synthetic concurrency unit",
                        group_code="synthetic",
                        equipment_type="general",
                        location="test",
                        manager_id=self.user.id,
                        bookable=True,
                        template="general",
                        template_version=1,
                        units={},
                        updated_at=utc_now(),
                    )
                    .returning(equipment.c.id)
                )
            ).scalar_one()

    async def asyncTearDown(self):
        await self.db.dispose()

    def values(self, *, equipment_id=None, start=0, end=1, kind="booking", status="planned"):
        return dict(
            equipment_id=equipment_id or self.eq,
            user_id=self.user.id,
            kind=kind,
            status=status,
            starts_at=self.now + timedelta(hours=start),
            ends_at=self.now + timedelta(hours=end),
            request_key=uuid4().hex,
            created_at=utc_now(),
            updated_at=utc_now(),
            updated_by_id=self.user.id,
        )

    async def race(self, statements):
        barrier = asyncio.Barrier(len(statements))

        async def participant(statement):
            # Separate pooled physical connections, transactions begun before
            # either participant writes. No shared Python/application lock.
            async with self.db.engine.connect() as connection:
                transaction = await connection.begin()
                await barrier.wait()
                try:
                    await connection.execute(statement)
                    await transaction.commit()
                    return "committed"
                except DBAPIError as error:
                    await transaction.rollback()
                    # Exclusion checks may resolve a simultaneous insert by
                    # aborting a deadlock participant (40P01); it is still a
                    # database-enforced conflict with exactly one committed row.
                    if getattr(error.orig, "sqlstate", None) not in {"23P01", "23505", "40P01"}:
                        raise
                    return "conflict"

        return await asyncio.wait_for(
            asyncio.gather(*(participant(s) for s in statements)), timeout=20
        )

    async def test_independent_transactions_exclusion_is_authoritative(self):
        results = await self.race(
            [
                insert(reservation).values(**self.values()),
                insert(reservation).values(**self.values(start=0.5, end=2)),
            ]
        )
        self.assertCountEqual(results, ["committed", "conflict"])
        async with self.db.engine.connect() as connection:
            self.assertEqual(
                await connection.scalar(
                    select(func.count())
                    .select_from(reservation)
                    .where(reservation.c.equipment_id == self.eq)
                ),
                1,
            )

    async def test_adjacent_different_units_and_maintenance_release(self):
        async with self.db.begin() as connection:
            other = (
                await connection.execute(
                    insert(equipment)
                    .values(
                        code=f"B-{self.suffix}",
                        name="Synthetic adjacent unit",
                        group_code="test",
                        equipment_type="general",
                        location="test",
                        template="general",
                        units={},
                        updated_at=utc_now(),
                    )
                    .returning(equipment.c.id)
                )
            ).scalar_one()
            first = (
                await connection.execute(
                    insert(reservation).values(**self.values()).returning(reservation.c.id)
                )
            ).scalar_one()
            await connection.execute(insert(reservation).values(**self.values(start=1, end=2)))
            await connection.execute(insert(reservation).values(**self.values(equipment_id=other)))
        with self.assertRaises(IntegrityError):
            async with self.db.begin() as connection:
                await connection.execute(
                    insert(reservation).values(**self.values(kind="maintenance", status="blocked"))
                )
        for released_state in ("cancelled", "no_show"):
            async with self.db.begin() as connection:
                await connection.execute(
                    update(reservation)
                    .where(reservation.c.id == first)
                    .values(status=released_state)
                )
                maintenance = (
                    await connection.execute(
                        insert(reservation)
                        .values(**self.values(kind="maintenance", status="blocked"))
                        .returning(reservation.c.id)
                    )
                ).scalar_one()
            with self.assertRaises(IntegrityError):
                async with self.db.begin() as connection:
                    await connection.execute(insert(reservation).values(**self.values()))
            async with self.db.begin() as connection:
                await connection.execute(
                    update(reservation)
                    .where(reservation.c.id == maintenance)
                    .values(status="released")
                )
                await connection.execute(
                    update(reservation).where(reservation.c.id == first).values(status="planned")
                )
        async with self.db.begin() as connection:
            await connection.execute(
                update(reservation)
                .where(reservation.c.id == first)
                .values(
                    status="completed",
                    actual_start=self.now,
                    actual_end=self.now + timedelta(minutes=10),
                )
            )
        with self.assertRaises(IntegrityError):
            async with self.db.begin() as connection:
                await connection.execute(insert(reservation).values(**self.values()))

    async def test_database_rejects_two_in_use_for_nonoverlapping_windows(self):
        async with self.db.begin() as connection:
            first = (
                await connection.execute(
                    insert(reservation).values(**self.values()).returning(reservation.c.id)
                )
            ).scalar_one()
            second = (
                await connection.execute(
                    insert(reservation)
                    .values(**self.values(start=1, end=2))
                    .returning(reservation.c.id)
                )
            ).scalar_one()
        results = await self.race(
            [
                update(reservation)
                .where(reservation.c.id == identity)
                .values(status="in_use", actual_start=utc_now())
                for identity in (first, second)
            ]
        )
        self.assertCountEqual(results, ["committed", "conflict"])

    async def test_atomic_transitions_retry_and_no_duplicate_usage(self):
        payload = ReservationCreate(
            equipment_id=self.eq,
            starts_at=self.now,
            ends_at=self.now + timedelta(hours=1),
            request_key=uuid4().hex,
        )
        rows = await asyncio.gather(
            self.op.create_reservation(payload), self.op.create_reservation(payload)
        )
        self.assertEqual(rows[0]["id"], rows[1]["id"])
        identity = rows[0]["id"]
        with patch("web.operations.booking.utc_now", return_value=self.now + timedelta(minutes=1)):
            starts = await asyncio.gather(
                *(self.op.action(identity, ReservationAction(action="start")) for _ in range(2))
            )
        self.assertTrue(all(row["status"] == "in_use" for row in starts))
        with patch("web.operations.booking.utc_now", return_value=self.now + timedelta(minutes=30)):
            ends = await asyncio.gather(
                *(self.op.action(identity, ReservationAction(action="end")) for _ in range(2))
            )
        self.assertTrue(all(row["status"] == "completed" for row in ends))
        async with self.db.engine.connect() as connection:
            self.assertEqual(
                await connection.scalar(
                    select(func.count())
                    .select_from(usage_record)
                    .where(usage_record.c.reservation_id == identity)
                ),
                1,
            )
            self.assertEqual(
                await connection.scalar(
                    select(usage_record.c.status).where(usage_record.c.reservation_id == identity)
                ),
                "draft",
            )
        with self.assertRaises(StateConflict):
            await self.op.action(identity, ReservationAction(action="start"))

    async def test_account_locks_allow_cross_administrator_audit_foreign_keys(self):
        other = await WebRepository(self.db).create_user(
            username=f"other-{self.suffix}",
            display_name="Synthetic second administrator",
            password_hash="unused-synthetic-hash",
            role=UserRole.ADMINISTRATOR,
        )
        barrier = asyncio.Barrier(2)

        async def participant(actor_id, target_id):
            async with self.db.begin() as connection:
                store = BookingStore(connection)
                await store.one(users, users.c.id == target_id, lock=True)
                await barrier.wait()
                # These FKs take KEY SHARE on the opposite locked user.
                # FOR UPDATE would create an AB/BA deadlock here.
                await BookingOperations(self.db, actor_id).audit(
                    store,
                    "workflow_access.lock_test",
                    workflow_access,
                    target_id,
                )

        await asyncio.wait_for(
            asyncio.gather(
                participant(self.user.id, other.id),
                participant(other.id, self.user.id),
            ),
            timeout=20,
        )

    async def test_service_concurrent_overlap_returns_business_conflict(self):
        payloads = [
            ReservationCreate(
                equipment_id=self.eq,
                starts_at=self.now + timedelta(minutes=minutes),
                ends_at=self.now + timedelta(hours=1),
                request_key=uuid4().hex,
            )
            for minutes in (0, 10)
        ]
        results = await asyncio.wait_for(
            asyncio.gather(
                *(self.op.create_reservation(payload) for payload in payloads),
                return_exceptions=True,
            ),
            timeout=20,
        )
        self.assertEqual(sum(isinstance(result, dict) for result in results), 1)
        self.assertEqual(sum(isinstance(result, StateConflict) for result in results), 1)

    async def test_runtime_does_not_have_extension_or_ddl_privileges(self):
        async with self.db.engine.connect() as connection:
            role = (
                await connection.execute(
                    text(
                        "SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = current_user"
                    )
                )
            ).one()
            self.assertEqual(tuple(role), (False, False, False))
            self.assertFalse(
                await connection.scalar(
                    text("SELECT has_schema_privilege(current_user, 'public', 'CREATE')")
                )
            )
            constraints = (
                (
                    await connection.execute(
                        text(
                            "SELECT conname FROM pg_constraint WHERE conrelid = 'reservation'::regclass"
                        )
                    )
                )
                .scalars()
                .all()
            )
            self.assertIn("reservation_no_overlap", constraints)


@unittest.skipUnless(
    os.environ.get("PEROVSKITE_MIGRATION_DATABASE_URL")
    and os.environ.get("PEROVSKITE_TEST_POSTGRESQL_URL"),
    "requires isolated schema on real PostgreSQL with migrator role",
)
class BookingMigrationTests(unittest.IsolatedAsyncioTestCase):
    async def test_upgrade_grants_all_legacy_roles_only_once(self):
        database = Database(os.environ["PEROVSKITE_MIGRATION_DATABASE_URL"])
        schema = "booking_migration_" + uuid4().hex[:12]
        root = Path(__file__).resolve().parents[1]
        config = Config(str(root / "alembic.ini"))
        # Explicit version schema prevents discovery of public.alembic_version
        # through the search path when the disposable schema is still empty.
        config.attributes["version_table_schema"] = schema

        def migrate(connection, revision):
            config.attributes["connection"] = connection
            command.upgrade(config, revision)

        try:
            async with database.engine.begin() as connection:
                # Schema name consists solely of this fixed prefix + hex.
                await connection.execute(text(f"CREATE SCHEMA {schema}"))
                await connection.execute(text(f"SET LOCAL search_path TO {schema}, public"))
                await connection.run_sync(migrate, "0016_device_scan_stats")
                now = utc_now()
                old_ids = []
                for role in ("student", "instructor", "administrator"):
                    old_ids.append(
                        (
                            await connection.execute(
                                insert(users)
                                .values(
                                    username=f"legacy-{role}",
                                    display_name="Synthetic legacy user",
                                    password_hash="unused",
                                    role=role,
                                    is_active=role != "instructor",
                                    failed_login_count=0,
                                    password_changed_at=now,
                                    created_at=now,
                                    updated_at=now,
                                )
                                .returning(users.c.id)
                            )
                        ).scalar_one()
                    )
                await connection.run_sync(migrate, "head")
                self.assertEqual(
                    await connection.scalar(select(func.count()).select_from(equipment)), 20
                )
                self.assertEqual(
                    await connection.scalar(
                        select(func.count())
                        .select_from(equipment)
                        .where(equipment.c.bookable.is_(True))
                    ),
                    0,
                )
                self.assertCountEqual(
                    (await connection.execute(select(workflow_access.c.user_id))).scalars().all(),
                    old_ids,
                )
                for role in ("student", "instructor"):
                    await connection.execute(
                        insert(users).values(
                            username=f"new-{role}",
                            display_name="Synthetic booking user",
                            password_hash="unused",
                            role=role,
                            password_changed_at=now,
                            created_at=now,
                            updated_at=now,
                        )
                    )
                await connection.run_sync(migrate, "head")
                await connection.run_sync(migrate, "head")
                self.assertCountEqual(
                    (await connection.execute(select(workflow_access.c.user_id))).scalars().all(),
                    old_ids,
                )
                await connection.execute(text("RESET search_path"))
                await connection.execute(text(f"DROP SCHEMA {schema} CASCADE"))
            # Repeated catalogue initialization never grants users access.
            async with database.engine.connect() as connection:
                before = await connection.scalar(select(func.count()).select_from(workflow_access))
            await seed_equipment(database)
            await seed_equipment(database)
            async with database.engine.connect() as connection:
                self.assertEqual(
                    await connection.scalar(select(func.count()).select_from(workflow_access)),
                    before,
                )
        finally:
            await database.dispose()
