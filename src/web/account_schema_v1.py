"""Frozen password-token schema shared by migration 0018 and runtime metadata."""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, MetaData, String, Table


def password_token_table(metadata: MetaData) -> Table:
    return Table(
        "password_reset_tokens", metadata,
        Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        Column("token_hash", String(64), nullable=False, unique=True),
        Column("issued_at", DateTime(timezone=True), nullable=False),
        Column("expires_at", DateTime(timezone=True), nullable=False),
    )
