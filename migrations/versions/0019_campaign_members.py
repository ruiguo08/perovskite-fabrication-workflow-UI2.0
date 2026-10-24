"""Campaign memberships: per-campaign reader/participant/manager roles.

Revision ID: 0019_campaign_members
Revises: 0018_password_self_service

Derivation (one-time, only when crossing this revision): each campaign's
creator becomes its manager and each distinct experiment owner becomes a
participant of that experiment's campaign. ON CONFLICT DO NOTHING means an
existing row — including a previously revoked membership — is never
overwritten, so nothing revoked is resurrected and later seeds stay inert.
"""

import sqlalchemy as sa
from alembic import op

from web.campaign_schema_v1 import campaign_membership_table

revision = "0019_campaign_members"
down_revision = "0018_password_self_service"
branch_labels = None
depends_on = None


def member_table() -> sa.Table:
    # Same convention as web.database.NAMING_CONVENTION so Alembic and the
    # runtime create_all emit identical DDL (the alembic-check baseline).
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
    sa.Table(
        "campaigns",
        metadata,
        sa.Column("code", sa.String(160), primary_key=True),
    )
    return campaign_membership_table(metadata)


def upgrade():
    member_table().create(op.get_bind())
    op.execute("""
        INSERT INTO campaign_members
            (campaign_code, user_id, role, granted_by_user_id, granted_at)
        SELECT c.code, c.created_by_id, 'manager', NULL::integer, CURRENT_TIMESTAMP
        FROM campaigns c
        WHERE c.created_by_id IS NOT NULL
        ON CONFLICT DO NOTHING
    """)
    op.execute("""
        INSERT INTO campaign_members
            (campaign_code, user_id, role, granted_by_user_id, granted_at)
        SELECT DISTINCT e.campaign_id, e.created_by_id, 'participant', NULL::integer,
                        CURRENT_TIMESTAMP
        FROM experiments e
        WHERE e.campaign_id IS NOT NULL AND e.created_by_id IS NOT NULL
        ON CONFLICT DO NOTHING
    """)
    op.execute("""
        INSERT INTO audit_events (action, entity_type, entity_id, details, created_at)
        SELECT 'campaign.member_derive', 'campaign', campaign_code,
               jsonb_build_object('user_id', user_id, 'role', role,
                                  'source', '0019_campaign_members'),
               CURRENT_TIMESTAMP
        FROM campaign_members
    """)


def downgrade():
    # Derived memberships cannot be reconstructed from the members table
    # alone; operators re-derive from campaign creators and experiment
    # owners if they ever re-upgrade.
    member_table().drop(op.get_bind())
