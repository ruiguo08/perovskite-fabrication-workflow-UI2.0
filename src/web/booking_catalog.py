"""Idempotent equipment catalogue. No real people or experimental data."""

from copy import deepcopy

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from .audit_trail import utc_now
from .booking_catalog_v1 import CATALOG, DEFAULT_UNITS
from .database import BOOKING_TABLES, Database

# Stable codes, independently modelled group, type, location and template.


async def seed_equipment(database: Database) -> None:
    table = BOOKING_TABLES["equipment"]
    dialect_insert = pg_insert if database.engine.dialect.name == "postgresql" else sqlite_insert
    async with database.begin() as connection:
        for code, name, group, kind, location, template in CATALOG:
            await connection.execute(
                dialect_insert(table)
                .values(
                    code=code,
                    name=name,
                    group_code=group,
                    equipment_type=kind,
                    location=location,
                    template=template,
                    template_version=1,
                    units=deepcopy(DEFAULT_UNITS[template]),
                    manager_id=None,
                    bookable=False,
                    updated_at=utc_now(),
                )
                .on_conflict_do_nothing(index_elements=["code"])
            )
