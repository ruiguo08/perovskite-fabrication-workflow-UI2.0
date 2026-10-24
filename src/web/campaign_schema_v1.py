"""Frozen campaign-membership schema shared by migration 0019 and runtime metadata."""
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
)


def campaign_membership_table(metadata: MetaData) -> Table:
    return Table(
        "campaign_members", metadata,
        Column(
            "campaign_code",
            String(160),
            ForeignKey("campaigns.code", ondelete="CASCADE"),
            primary_key=True,
        ),
        Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        Column("role", String(16), nullable=False),
        Column("granted_by_user_id", ForeignKey("users.id", ondelete="SET NULL")),
        Column("granted_at", DateTime(timezone=True), nullable=False),
        Column("revoked_at", DateTime(timezone=True)),
    )
