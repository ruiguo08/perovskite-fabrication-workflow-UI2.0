"""Frozen booking v1 schema, shared with migration 0017. Do not edit after release."""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.types import TypeEngine


def booking_tables(metadata: MetaData, json_type: TypeEngine) -> dict[str, Table]:
    equipment = Table(
        "equipment",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("code", String(24), nullable=False, unique=True),
        Column("name", String(160), nullable=False),
        Column("group_code", String(40), nullable=False),
        Column("equipment_type", String(40), nullable=False),
        Column("location", String(80), nullable=False),
        Column("manager_id", ForeignKey("users.id", ondelete="RESTRICT")),
        Column("bookable", Boolean, nullable=False, server_default="false"),
        Column("template", String(24), nullable=False),
        Column("template_version", Integer, nullable=False, server_default="1"),
        Column("units", json_type, nullable=False),
        Column("description", Text, nullable=False, server_default=""),
        Column("updated_at", DateTime(timezone=True), nullable=False),
        CheckConstraint("NOT bookable OR manager_id IS NOT NULL", name="manager_required"),
        CheckConstraint("template IN ('glovebox','ald','evaporation','general')", name="template"),
        CheckConstraint("template_version = 1", name="template_version"),
    )
    reservation = Table(
        "reservation",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("equipment_id", ForeignKey("equipment.id", ondelete="RESTRICT"), nullable=False),
        Column("user_id", ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        Column("kind", String(24), nullable=False),
        Column("status", String(24), nullable=False),
        Column("starts_at", DateTime(timezone=True), nullable=False),
        Column("ends_at", DateTime(timezone=True), nullable=False),
        Column("actual_start", DateTime(timezone=True)),
        Column("actual_end", DateTime(timezone=True)),
        Column("reason", Text, nullable=False, server_default=""),
        Column("request_key", String(100), nullable=False, unique=True),
        Column("created_at", DateTime(timezone=True), nullable=False),
        Column("updated_at", DateTime(timezone=True), nullable=False),
        Column("updated_by_id", ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        CheckConstraint("ends_at > starts_at", name="positive_interval"),
        CheckConstraint(
            "(kind = 'booking' AND status IN ('planned','in_use','completed','cancelled','no_show')) OR (kind = 'maintenance' AND status IN ('blocked','released'))",
            name="kind_status",
        ),
        CheckConstraint(
            "(actual_start IS NULL AND actual_end IS NULL AND status NOT IN ('in_use','completed')) OR (actual_start IS NOT NULL AND actual_end IS NULL AND status = 'in_use') OR (actual_start IS NOT NULL AND actual_end IS NOT NULL AND actual_end >= actual_start AND status = 'completed')",
            name="actual_times",
        ),
    )
    occupied = "status IN ('planned','in_use','completed','blocked')"
    reservation.append_constraint(
        ExcludeConstraint(
            (reservation.c.equipment_id, "="),
            (text("tstzrange(starts_at, ends_at, '[)')"), "&&"),
            where=text(occupied),
            using="gist",
            name="reservation_no_overlap",
        ).ddl_if(dialect="postgresql")
    )
    Index(
        "uq_reservation_in_use",
        reservation.c.equipment_id,
        unique=True,
        postgresql_where=text("status = 'in_use'"),
        sqlite_where=text("status = 'in_use'"),
    )
    Index("ix_reservation_calendar", reservation.c.equipment_id, reservation.c.starts_at)
    usage = Table(
        "usage_record",
        metadata,
        Column("id", Integer, primary_key=True),
        Column(
            "reservation_id",
            ForeignKey("reservation.id", ondelete="RESTRICT"),
            nullable=False,
            unique=True,
        ),
        Column("template", String(24), nullable=False),
        Column("template_version", Integer, nullable=False),
        Column("units", json_type, nullable=False),
        Column("fields", json_type, nullable=False),
        Column("notes", Text, nullable=False, server_default=""),
        Column("status", String(24), nullable=False),
        Column("submitted_at", DateTime(timezone=True)),
        Column("updated_at", DateTime(timezone=True), nullable=False),
        Column("updated_by_id", ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        CheckConstraint("status IN ('draft','submitted')", name="status"),
        CheckConstraint(
            "(status = 'submitted' AND submitted_at IS NOT NULL) OR (status = 'draft' AND submitted_at IS NULL)",
            name="submission",
        ),
        CheckConstraint(
            "template IN ('glovebox','ald','evaporation','general') AND template_version = 1",
            name="template",
        ),
    )
    notice = Table(
        "equipment_notice",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("equipment_id", ForeignKey("equipment.id", ondelete="RESTRICT"), nullable=False),
        Column("body", Text, nullable=False),
        Column("pinned", Boolean, nullable=False, server_default="false"),
        Column("valid_from", DateTime(timezone=True), nullable=False),
        Column("valid_until", DateTime(timezone=True), nullable=False),
        Column("notify_until", DateTime(timezone=True)),
        Column("withdrawn_at", DateTime(timezone=True)),
        Column("created_by_id", ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        Column("updated_by_id", ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        Column("created_at", DateTime(timezone=True), nullable=False),
        Column("updated_at", DateTime(timezone=True), nullable=False),
        Column("request_key", String(100), nullable=False, unique=True),
        CheckConstraint("valid_until > valid_from", name="positive_validity"),
    )
    access = Table(
        "workflow_access",
        metadata,
        Column("user_id", ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True),
        Column("granted_by_id", ForeignKey("users.id", ondelete="RESTRICT")),
        Column("granted_at", DateTime(timezone=True), nullable=False),
        Column("revoked_by_id", ForeignKey("users.id", ondelete="RESTRICT")),
        Column("revoked_at", DateTime(timezone=True)),
        Column("source", String(24), nullable=False),
        CheckConstraint("source IN ('migration','administrator')", name="source"),
    )
    notification = Table(
        "user_notification",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("recipient_id", ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        Column("reservation_id", ForeignKey("reservation.id", ondelete="RESTRICT")),
        Column("notice_id", ForeignKey("equipment_notice.id", ondelete="RESTRICT")),
        Column("event", String(40), nullable=False),
        Column("created_at", DateTime(timezone=True), nullable=False),
        Column("read_at", DateTime(timezone=True)),
        Column("dedup_key", String(160), nullable=False, unique=True),
        CheckConstraint(
            "(reservation_id IS NOT NULL AND notice_id IS NULL AND event = 'reservation_cancelled') OR (notice_id IS NOT NULL AND reservation_id IS NULL AND event = 'equipment_notice')",
            name="related_event",
        ),
    )
    Index("ix_user_notification_inbox", notification.c.recipient_id, notification.c.created_at)
    return {
        table.name: table for table in (equipment, reservation, usage, notice, access, notification)
    }
