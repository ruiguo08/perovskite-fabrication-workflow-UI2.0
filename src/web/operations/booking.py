"""Booking use cases: authorization, transactions, lifecycle and audit."""

from contextlib import asynccontextmanager
from datetime import timedelta

from sqlalchemy.exc import DBAPIError

from ..audit_trail import add_audit_event, utc_now
from ..booking_models import (
    DEFAULT_UNITS,
    as_utc,
    validate_fields,
    validate_units,
)
from ..database import Database, users
from ..repository.booking import (
    BookingStore,
    equipment,
    equipment_notice,
    reservation,
    usage_record,
    user_notification,
    workflow_access,
)
from .errors import AccessDenied, InvalidInput, RecordNotFound, StateConflict


class BookingOperations:
    def __init__(self, database: Database, actor_id: int, client_ip: str | None = None):
        self.database = database
        self.actor_id = actor_id
        self.client_ip = client_ip

    @asynccontextmanager
    async def transaction(self):
        try:
            async with self.database.begin() as connection:
                store = BookingStore(connection)
                actor = await store.one(
                    users, users.c.id == self.actor_id, users.c.is_active.is_(True)
                )
                if actor is None:
                    raise AccessDenied("active account required")
                yield store, actor["role"] == "administrator"
        except DBAPIError as error:
            # Do not turn programming errors or unrelated integrity failures
            # into successful responses, and never expose driver diagnostics.
            constraint = getattr(getattr(error.orig, "__cause__", None), "constraint_name", None)
            sqlstate = getattr(error.orig, "sqlstate", None)
            message = str(error.orig)
            if (
                sqlstate in {"40P01", "40001"}
                or constraint
                in {
                    "reservation_no_overlap",
                    "uq_reservation_in_use",
                    "uq_reservation_request_key",
                    "uq_equipment_notice_request_key",
                }
                or any(
                    token in message
                    for token in (
                        "reservation.equipment_id",
                        "reservation.request_key",
                        "equipment_notice.request_key",
                    )
                )
            ):
                raise StateConflict(
                    "booking conflict; refresh and retry (contact the current user or equipment manager if equipment remains in use)"
                ) from None
            raise

    async def audit(self, store, action, table, identity, **details):
        await add_audit_event(
            store.connection,
            actor_user_id=self.actor_id,
            action=action,
            entity_type=table.name,
            entity_id=str(identity),
            details=details,
            client_ip=self.client_ip,
        )

    async def managed(self, store, equipment_id, admin):
        row = await store.one(equipment, equipment.c.id == equipment_id, lock=True)
        if row is None:
            raise RecordNotFound("equipment not found")
        if not admin and row["manager_id"] != self.actor_id:
            raise AccessDenied("equipment manager required")
        return row

    async def list_equipment(self):
        async with self.transaction() as (store, _):
            return await store.rows(equipment, order=[equipment.c.id])

    async def update_equipment(self, equipment_id, payload):
        async with self.transaction() as (store, admin):
            changes = payload.model_dump(exclude_unset=True)
            # Match account-deactivation lock order: users, then equipment.
            manager = None
            if changes.get("manager_id") is not None:
                manager = await store.one(users, users.c.id == changes["manager_id"], lock=True)
            row = await self.managed(store, equipment_id, admin)
            if "manager_id" in changes and not admin:
                raise AccessDenied("only a system administrator may assign equipment managers")
            if changes.get("manager_id") is not None and (
                manager is None or not manager["is_active"]
            ):
                raise InvalidInput("equipment manager must be an active user")
            combined = row | changes
            if combined["bookable"]:
                current_manager = manager or await store.one(
                    users, users.c.id == combined["manager_id"]
                )
                if current_manager is None or not current_manager["is_active"]:
                    raise InvalidInput(
                        "assign an active equipment manager before enabling reservations"
                    )
            template = combined["template"]
            if "template" in changes and "units" not in changes:
                changes["units"] = DEFAULT_UNITS[template].copy()
            validate_units(template, changes.get("units", row["units"]))
            result = await store.change(
                equipment, equipment.c.id == equipment_id, **changes, updated_at=utc_now()
            )
            await self.audit(store, "equipment.update", equipment, equipment_id, changes=changes)
            return result

    async def set_access(self, user_id, enabled):
        async with self.transaction() as (store, admin):
            if not admin:
                raise AccessDenied("system administrator required")
            if await store.one(users, users.c.id == user_id, lock=True) is None:
                raise RecordNotFound("user not found")
            row = await store.one(workflow_access, workflow_access.c.user_id == user_id, lock=True)
            now = utc_now()
            if enabled:
                values = dict(
                    granted_by_id=self.actor_id,
                    granted_at=now,
                    revoked_by_id=None,
                    revoked_at=None,
                    source="administrator",
                )
                if row is None:
                    await store.add(workflow_access, user_id=user_id, **values)
                else:
                    await store.change(
                        workflow_access, workflow_access.c.user_id == user_id, **values
                    )
            elif row is not None:
                await store.change(
                    workflow_access,
                    workflow_access.c.user_id == user_id,
                    revoked_by_id=self.actor_id,
                    revoked_at=now,
                )
            await self.audit(
                store,
                "workflow_access.grant" if enabled else "workflow_access.revoke",
                workflow_access,
                user_id,
            )
            return {"user_id": user_id, "workflow_access": enabled}

    async def list_access(self):
        async with self.transaction() as (store, admin):
            if not admin:
                raise AccessDenied("system administrator required")
            return await store.rows(workflow_access, order=[workflow_access.c.user_id])

    async def create_reservation(self, payload):
        async with self.transaction() as (store, admin):
            row = await store.one(equipment, equipment.c.id == payload.equipment_id, lock=True)
            if row is None:
                raise RecordNotFound("equipment not found")
            key = f"{self.actor_id}:{payload.request_key}"
            old = await store.one(reservation, reservation.c.request_key == key)
            if old is not None:
                if (
                    old["equipment_id"],
                    old["kind"],
                    as_utc(old["starts_at"]),
                    as_utc(old["ends_at"]),
                    old["reason"],
                ) != (
                    payload.equipment_id,
                    payload.kind,
                    as_utc(payload.starts_at),
                    as_utc(payload.ends_at),
                    payload.reason,
                ):
                    raise StateConflict("request key already used for a different reservation")
                return old
            maintenance = payload.kind == "maintenance"
            if maintenance:
                await self.managed(store, row["id"], admin)
                if not payload.reason:
                    raise InvalidInput("maintenance reason is required")
            else:
                manager = await store.one(
                    users, users.c.id == row["manager_id"], users.c.is_active.is_(True)
                )
                if not row["bookable"] or manager is None:
                    raise StateConflict("equipment is unavailable for reservations")
            now = utc_now()
            if payload.starts_at < now:
                raise InvalidInput("past reservations are not supported")
            await self.check_overlap(store, row["id"], payload.starts_at, payload.ends_at)
            result = await store.add(
                reservation,
                equipment_id=row["id"],
                user_id=self.actor_id,
                kind=payload.kind,
                status="blocked" if maintenance else "planned",
                starts_at=payload.starts_at,
                ends_at=payload.ends_at,
                reason=payload.reason,
                request_key=key,
                created_at=now,
                updated_at=now,
                updated_by_id=self.actor_id,
            )
            if not maintenance:
                await store.add(
                    usage_record,
                    reservation_id=result["id"],
                    template=row["template"],
                    template_version=row["template_version"],
                    units=row["units"],
                    fields={},
                    notes="",
                    status="draft",
                    updated_at=now,
                    updated_by_id=self.actor_id,
                )
            await self.audit(
                store, "reservation.create", reservation, result["id"], kind=payload.kind
            )
            return result

    async def check_overlap(self, store, equipment_id, starts_at, ends_at, except_id=-1):
        # Friendly diagnostics and SQLite compatibility. PostgreSQL's exclusion
        # constraint is authoritative even for independent direct SQL clients.
        if await store.one(
            reservation,
            reservation.c.equipment_id == equipment_id,
            reservation.c.id != except_id,
            reservation.c.status.in_(["planned", "in_use", "completed", "blocked"]),
            reservation.c.starts_at < ends_at,
            reservation.c.ends_at > starts_at,
        ):
            raise StateConflict("time slot overlaps an existing reservation or maintenance block")

    async def locked_reservation(self, store, identity):
        row = await store.one(reservation, reservation.c.id == identity)
        if row is None:
            raise RecordNotFound("reservation not found")
        # All equipment mutations take this lock first, including separate
        # reservations whose actual usage may overlap after an overrun.
        eq = await store.one(equipment, equipment.c.id == row["equipment_id"], lock=True)
        row = await store.one(reservation, reservation.c.id == identity, lock=True)
        return row, eq

    async def reschedule(self, identity, payload):
        async with self.transaction() as (store, _):
            row, _eq = await self.locked_reservation(store, identity)
            if row["user_id"] != self.actor_id or row["kind"] != "booking":
                raise AccessDenied("only the reservation owner may reschedule")
            now = utc_now()
            if row["status"] != "planned" or as_utc(row["starts_at"]) <= now:
                raise StateConflict("only unstarted future reservations may be rescheduled")
            if payload.starts_at < now:
                raise InvalidInput("past reservations are not supported")
            await self.check_overlap(
                store, row["equipment_id"], payload.starts_at, payload.ends_at, identity
            )
            result = await store.change(
                reservation,
                reservation.c.id == identity,
                starts_at=payload.starts_at,
                ends_at=payload.ends_at,
                updated_at=now,
                updated_by_id=self.actor_id,
            )
            await self.audit(
                store,
                "reservation.reschedule",
                reservation,
                identity,
                starts_at=payload.starts_at.isoformat(),
                ends_at=payload.ends_at.isoformat(),
            )
            return result

    async def action(self, identity, payload):
        async with self.transaction() as (store, admin):
            row, eq = await self.locked_reservation(store, identity)
            owner = row["user_id"] == self.actor_id
            manager = admin or eq["manager_id"] == self.actor_id
            action, state, now = payload.action, row["status"], utc_now()
            values = {"updated_at": now, "updated_by_id": self.actor_id}
            if action in {"release", "no_show", "force_end"}:
                if not manager:
                    raise AccessDenied("equipment manager required")
                if not payload.reason:
                    raise InvalidInput("reason is required")
            elif action == "cancel":
                if not owner and not manager:
                    raise AccessDenied("reservation owner or equipment manager required")
                if not owner and not payload.reason:
                    raise InvalidInput("cancellation reason is required")
            elif not owner:
                raise AccessDenied("reservation owner required")
            if row["kind"] == "maintenance":
                if action != "release":
                    raise StateConflict("maintenance blocks must be released")
                if state == "released":
                    return row
                values.update(status="released", reason=payload.reason)
            elif action == "release":
                raise StateConflict("only maintenance blocks can be released")
            elif action == "cancel":
                if state == "cancelled":
                    return row
                if state != "planned" or (not owner and as_utc(row["starts_at"]) <= now):
                    raise StateConflict(
                        "only a planned reservation may be cancelled; manager cancellation must precede its start"
                    )
                values.update(status="cancelled", reason=payload.reason)
                if not owner:
                    await self.notify(
                        store, row["user_id"], "reservation_cancelled", reservation_id=identity
                    )
            elif action == "no_show":
                if state == "no_show":
                    return row
                if state != "planned" or now < as_utc(row["ends_at"]):
                    raise StateConflict(
                        "no-show requires a planned reservation whose window has ended"
                    )
                values.update(status="no_show", reason=payload.reason)
            elif action == "start":
                if state == "in_use":
                    return row
                if state != "planned" or not (
                    as_utc(row["starts_at"]) <= now < as_utc(row["ends_at"])
                ):
                    raise StateConflict(
                        "start requires a planned reservation inside its time window"
                    )
                if await store.one(
                    reservation,
                    reservation.c.equipment_id == eq["id"],
                    reservation.c.status == "in_use",
                ):
                    raise StateConflict(
                        "equipment remains in use; contact the current user or equipment manager"
                    )
                values.update(status="in_use", actual_start=now)
            else:
                if state == "completed":
                    return row
                if state != "in_use":
                    raise StateConflict("ending requires an in-use reservation")
                if action == "submit_and_end":
                    await self.save_usage(store, row, payload.fields, payload.notes, submit=True)
                elif payload.fields is not None or payload.notes is not None:
                    if action == "force_end":
                        raise InvalidInput(
                            "managers may end use but cannot write another user's ledger"
                        )
                    await self.save_usage(store, row, payload.fields, payload.notes, submit=False)
                values.update(status="completed", actual_end=now)
                if action == "force_end":
                    values["reason"] = payload.reason
            result = await store.change(
                reservation, reservation.c.id == identity, reservation.c.status == state, **values
            )
            if result is None:
                raise StateConflict("reservation changed concurrently; refresh and retry")
            await self.audit(
                store,
                f"reservation.{action}",
                reservation,
                identity,
                previous_status=state,
                status=values["status"],
                reason=payload.reason,
            )
            return result

    async def save_usage(self, store, row, fields, notes, *, submit):
        usage = await store.one(usage_record, usage_record.c.reservation_id == row["id"], lock=True)
        if usage is None:
            raise StateConflict("usage snapshot is missing")
        if row["status"] in {"cancelled", "no_show"} or row["kind"] != "booking":
            raise StateConflict("reservation has no editable usage")
        if usage["status"] == "submitted" and not submit:
            raise StateConflict("a submitted ledger cannot be reverted to draft")
        if submit and row["status"] not in {"in_use", "completed"}:
            raise StateConflict("submit the ledger while ending use or after completion")
        validated = validate_fields(
            usage["template"],
            usage["template_version"],
            usage["fields"] if fields is None else fields,
            submit=submit,
        )
        values = dict(
            fields=validated,
            notes=usage["notes"] if notes is None else notes,
            updated_at=utc_now(),
            updated_by_id=self.actor_id,
        )
        if submit:
            values.update(status="submitted", submitted_at=utc_now())
        result = await store.change(usage_record, usage_record.c.id == usage["id"], **values)
        await self.audit(
            store,
            "usage.amend"
            if usage["status"] == "submitted"
            else ("usage.submit" if submit else "usage.draft"),
            usage_record,
            usage["id"],
            reservation_id=row["id"],
            previous_fields=usage["fields"],
            previous_notes=usage["notes"],
            fields=validated,
            notes=values["notes"],
        )
        return result

    async def update_usage(self, identity, payload):
        async with self.transaction() as (store, _):
            row, _eq = await self.locked_reservation(store, identity)
            if row["user_id"] != self.actor_id:
                raise AccessDenied("only the reservation owner may edit usage")
            if payload.submit and row["status"] != "completed":
                raise StateConflict("use submit_and_end to submit and end in one transaction")
            return await self.save_usage(
                store, row, payload.fields, payload.notes, submit=payload.submit
            )

    async def get_usage(self, identity):
        async with self.transaction() as (store, admin):
            row, eq = await self.locked_reservation(store, identity)
            if row["user_id"] != self.actor_id and not admin and eq["manager_id"] != self.actor_id:
                raise AccessDenied("usage is private to its owner and equipment managers")
            return await store.one(usage_record, usage_record.c.reservation_id == identity)

    async def reservation_detail(self, identity):
        async with self.transaction() as (store, admin):
            row, eq = await self.locked_reservation(store, identity)
            if row["user_id"] != self.actor_id and not admin and eq["manager_id"] != self.actor_id:
                raise AccessDenied(
                    "reservation details are private to its owner and equipment managers"
                )
            return row

    async def ledger(self, equipment_id=None, pending=False, offset=0):
        async with self.transaction() as (store, admin):
            return await store.ledger(self.actor_id, admin, equipment_id, pending, offset)

    async def calendar(self, starts_at, ends_at, equipment_id=None, history=False, offset=0):
        starts_at, ends_at = as_utc(starts_at), as_utc(ends_at)
        if ends_at <= starts_at or ends_at - starts_at > timedelta(days=93):
            raise InvalidInput("calendar range must be positive and at most 93 days")
        async with self.transaction() as (store, _):
            return await store.calendar(starts_at, ends_at, equipment_id, history, offset)

    async def notify(self, store, recipient_id, event, reservation_id=None, notice_id=None):
        key = f"{event}:{reservation_id or notice_id}:{recipient_id}"
        if await store.one(user_notification, user_notification.c.dedup_key == key) is None:
            await store.add(
                user_notification,
                recipient_id=recipient_id,
                event=event,
                reservation_id=reservation_id,
                notice_id=notice_id,
                dedup_key=key,
                created_at=utc_now(),
            )

    async def create_notice(self, payload):
        async with self.transaction() as (store, admin):
            await self.managed(store, payload.equipment_id, admin)
            key = f"{self.actor_id}:{payload.request_key}"
            old = await store.one(equipment_notice, equipment_notice.c.request_key == key)
            if old is not None:
                if (
                    old["equipment_id"],
                    old["body"],
                    old["pinned"],
                    as_utc(old["valid_from"]),
                    as_utc(old["valid_until"]),
                    as_utc(old["notify_until"]) if old["notify_until"] else None,
                ) != (
                    payload.equipment_id,
                    payload.body,
                    payload.pinned,
                    as_utc(payload.valid_from),
                    as_utc(payload.valid_until),
                    as_utc(payload.notify_until) if payload.notify_until else None,
                ):
                    raise StateConflict("request key already used for a different notice")
                return old
            now = utc_now()
            values = payload.model_dump(exclude={"request_key"})
            result = await store.add(
                equipment_notice,
                **values,
                request_key=key,
                created_at=now,
                updated_at=now,
                created_by_id=self.actor_id,
                updated_by_id=self.actor_id,
            )
            if payload.notify_until is not None:
                if payload.notify_until <= now or payload.notify_until > now + timedelta(days=31):
                    raise InvalidInput("notification horizon must be within the next 31 days")
                # No row cap: every affected recipient must be notified. Query
                # through calendar pages to keep memory and SQL bounded.
                offset = 0
                while True:
                    rows = await store.calendar(
                        now, payload.notify_until, payload.equipment_id, False, offset
                    )
                    for row in rows:
                        if row["kind"] == "booking" and row["status"] in {"planned", "in_use"}:
                            await self.notify(
                                store, row["user_id"], "equipment_notice", notice_id=result["id"]
                            )
                    if len(rows) < 1000:
                        break
                    offset += 1000
            await self.audit(store, "equipment_notice.create", equipment_notice, result["id"])
            return result

    async def update_notice(self, identity, payload):
        async with self.transaction() as (store, admin):
            row = await store.one(equipment_notice, equipment_notice.c.id == identity)
            if row is None:
                raise RecordNotFound("notice not found")
            await self.managed(store, row["equipment_id"], admin)
            values = dict(updated_at=utc_now(), updated_by_id=self.actor_id)
            if payload.pinned is not None:
                values["pinned"] = payload.pinned
            if payload.withdraw:
                values["withdrawn_at"] = row["withdrawn_at"] or utc_now()
            result = await store.change(
                equipment_notice, equipment_notice.c.id == identity, **values
            )
            await self.audit(
                store,
                "equipment_notice.update",
                equipment_notice,
                identity,
                pinned=payload.pinned,
                withdraw=payload.withdraw,
            )
            return result

    async def list_notices(self, equipment_id=None, offset=0):
        async with self.transaction() as (store, _):
            now = utc_now()
            criteria = [
                equipment_notice.c.withdrawn_at.is_(None),
                equipment_notice.c.valid_from <= now,
                equipment_notice.c.valid_until > now,
            ]
            if equipment_id is not None:
                criteria.append(equipment_notice.c.equipment_id == equipment_id)
            return await store.rows(
                equipment_notice,
                *criteria,
                order=[equipment_notice.c.pinned.desc(), equipment_notice.c.id.desc()],
                offset=offset,
            )

    async def notifications(self, identity=None, offset=0):
        async with self.transaction() as (store, _):
            if identity is not None:
                row = await store.one(
                    user_notification,
                    user_notification.c.id == identity,
                    user_notification.c.recipient_id == self.actor_id,
                    lock=True,
                )
                if row is None:
                    raise RecordNotFound("notification not found")
                return await store.change(
                    user_notification,
                    user_notification.c.id == identity,
                    read_at=row["read_at"] or utc_now(),
                )
            return await store.rows(
                user_notification,
                user_notification.c.recipient_id == self.actor_id,
                order=[user_notification.c.id.desc()],
                offset=offset,
            )
