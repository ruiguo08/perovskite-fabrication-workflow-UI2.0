"""Single-use account activation and password-recovery tokens.

Revision ID: 0018_password_self_service
Revises: 0017_equipment_booking
"""

import sqlalchemy as sa
from alembic import op

from web.account_schema_v1 import password_token_table

revision = "0018_password_self_service"
down_revision = "0017_equipment_booking"
branch_labels = None
depends_on = None


def token_table() -> sa.Table:
    # The convention duplicates web.database.NAMING_CONVENTION so constraint
    # names match what runtime create_all would produce (the alembic-check
    # baseline); migrations stay self-contained like 0017.
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
    return password_token_table(metadata)


def upgrade():
    token_table().create(op.get_bind())


def downgrade():
    token_table().drop(op.get_bind())
