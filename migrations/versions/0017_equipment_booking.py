"""Equipment booking and one-time preservation of existing workflow access.

Revision ID: 0017_equipment_booking
Revises: 0016_device_scan_stats
"""

import json
from datetime import datetime, timezone

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

from web.booking_catalog_v1 import CATALOG, DEFAULT_UNITS
from web.booking_schema_v1 import booking_tables

revision = "0017_equipment_booking"
down_revision = "0016_device_scan_stats"
branch_labels = None
depends_on = None


def tables():
    metadata = sa.MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )
    sa.Table("users", metadata, sa.Column("id", sa.Integer, primary_key=True))
    return booking_tables(metadata, sa.JSON().with_variant(JSONB(), "postgresql"))


def upgrade():
    # Trusted extension installed by the migration/database-owner role, never
    # by the runtime application. Deployments may pre-provision it instead.
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    created = tables()
    for table in created.values():
        table.create(op.get_bind(), checkfirst=False)
    # Initial units remain closed until an administrator assigns managers.
    # A separate idempotent seed-equipment command can repair missing units.
    now = datetime.now(timezone.utc)
    for code, name, group, kind, location, template in CATALOG:
        op.get_bind().execute(
            created["equipment"]
            .insert()
            .values(
                code=code,
                name=name,
                group_code=group,
                equipment_type=kind,
                location=location,
                template=template,
                template_version=1,
                units=sa.cast(
                    op.inline_literal(json.dumps(DEFAULT_UNITS[template], ensure_ascii=False)),
                    JSONB,
                ),
                updated_at=now,
                bookable=False,
            )
        )
    # This runs ONLY when Alembic crosses this revision. It includes every
    # pre-upgrade role and inactive account; no startup/bootstrap backfill.
    op.execute("""
        INSERT INTO workflow_access (user_id, granted_at, source)
        SELECT id, CURRENT_TIMESTAMP, 'migration' FROM users
    """)
    op.execute("""
        INSERT INTO audit_events (action, entity_type, entity_id, details, created_at)
        SELECT 'workflow_access.migrate', 'workflow_access', CAST(user_id AS VARCHAR),
               '{"source":"0017_equipment_booking"}'::jsonb, CURRENT_TIMESTAMP
        FROM workflow_access
    """)


def downgrade():
    # Retain the shared extension. Operators must back up booking records and
    # access grants before downgrading; Alembic never guesses how to restore them.
    for table in reversed(list(tables().values())):
        table.drop(op.get_bind(), checkfirst=False)
