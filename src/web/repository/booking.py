"""Connection-level booking persistence. Callers own transactions and policy."""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Table, insert, select, update
from sqlalchemy.ext.asyncio import AsyncConnection

from ..database import BOOKING_TABLES, users

equipment = BOOKING_TABLES["equipment"]
reservation = BOOKING_TABLES["reservation"]
usage_record = BOOKING_TABLES["usage_record"]
equipment_notice = BOOKING_TABLES["equipment_notice"]
workflow_access = BOOKING_TABLES["workflow_access"]
user_notification = BOOKING_TABLES["user_notification"]


def normalize_row(row):
    return {
        key: (
            value.replace(tzinfo=timezone.utc)
            if value.tzinfo is None
            else value.astimezone(timezone.utc)
        )
        if isinstance(value, datetime)
        else value
        for key, value in row.items()
    }


class BookingStore:
    def __init__(self, connection: AsyncConnection):
        self.connection = connection

    async def rows(
        self, table: Table, *criteria, lock=False, limit=1000, order=None, offset=0
    ) -> list[dict[str, Any]]:
        statement = select(table).where(*criteria).limit(limit).offset(offset)
        if order is not None:
            statement = statement.order_by(*order)
        if lock:
            # Identity keys never change here. NO KEY UPDATE serializes user
            # activity/manager changes while allowing audit FKs' KEY SHARE.
            statement = statement.with_for_update(key_share=table is users)
        return [normalize_row(row) for row in (await self.connection.execute(statement)).mappings()]

    async def one(self, table: Table, *criteria, lock=False) -> dict | None:
        rows = await self.rows(table, *criteria, lock=lock, limit=1)
        return rows[0] if rows else None

    async def add(self, table: Table, **values) -> dict:
        return normalize_row(
            (await self.connection.execute(insert(table).values(**values).returning(table)))
            .mappings()
            .one()
        )

    async def change(self, table: Table, *criteria, **values) -> dict | None:
        row = (
            (
                await self.connection.execute(
                    update(table).where(*criteria).values(**values).returning(table)
                )
            )
            .mappings()
            .one_or_none()
        )
        return normalize_row(row) if row is not None else None

    async def calendar(self, starts_at, ends_at, equipment_id, history, offset) -> list[dict]:
        criteria = [reservation.c.starts_at < ends_at, reservation.c.ends_at > starts_at]
        if equipment_id is not None:
            criteria.append(reservation.c.equipment_id == equipment_id)
        if not history:
            criteria.append(reservation.c.status.in_(["planned", "in_use", "completed", "blocked"]))
        statement = (
            select(
                reservation.c.id,
                reservation.c.equipment_id,
                equipment.c.code,
                reservation.c.user_id,
                users.c.display_name.label("reserved_by"),
                reservation.c.kind,
                reservation.c.status,
                reservation.c.starts_at,
                reservation.c.ends_at,
                reservation.c.actual_start,
                reservation.c.actual_end,
            )
            .join(equipment, equipment.c.id == reservation.c.equipment_id)
            .join(users, users.c.id == reservation.c.user_id)
            .where(*criteria)
            .order_by(reservation.c.starts_at, reservation.c.id)
            .offset(offset)
            .limit(1000)
        )
        return [normalize_row(row) for row in (await self.connection.execute(statement)).mappings()]

    async def ledger(self, actor_id, admin, equipment_id, pending, offset) -> list[dict]:
        statement = (
            select(
                usage_record,
                reservation.c.equipment_id,
                reservation.c.user_id,
                reservation.c.status.label("reservation_status"),
                reservation.c.actual_start,
                reservation.c.actual_end,
            )
            .join(reservation, reservation.c.id == usage_record.c.reservation_id)
            .join(equipment, equipment.c.id == reservation.c.equipment_id)
        )
        if not admin:
            statement = statement.where(
                (reservation.c.user_id == actor_id) | (equipment.c.manager_id == actor_id)
            )
        if equipment_id is not None:
            statement = statement.where(equipment.c.id == equipment_id)
        if pending:
            statement = statement.where(
                reservation.c.status == "completed", usage_record.c.status != "submitted"
            )
        statement = statement.order_by(usage_record.c.id.desc()).offset(offset).limit(1000)
        return [normalize_row(row) for row in (await self.connection.execute(statement)).mappings()]
