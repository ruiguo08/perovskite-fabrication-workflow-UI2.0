"""Campaign-domain methods of :class:`web.repository.WebRepository`."""

from __future__ import annotations

from typing import Any, Iterable, Mapping

from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncConnection

from ..database import CAMPAIGN_CODE_MAX_LENGTH, campaign_members, campaigns, users
from .helpers import (
    _add_audit_event,
    _as_utc,
    _inserted_id,
    _normalize_display_name,
    _optional_utc,
    _utc_now,
)
from .records import (
    CampaignMemberRecord,
    CampaignMembershipRole,
    CampaignRecord,
    CampaignStatus,
    UserRole,
)


def _campaign_record(row: Mapping[str, Any]) -> CampaignRecord:
    return CampaignRecord(
        id=int(row["id"]),
        code=str(row["code"]),
        display_name=str(row["display_name"]),
        description=str(row["description"]),
        status=CampaignStatus(row["status"]),
        created_at=_as_utc(row["created_at"]),
        updated_at=_as_utc(row["updated_at"]),
        closed_at=_optional_utc(row["closed_at"]),
        created_by_id=row["created_by_id"],
    )

def _normalize_campaign_code(code: str) -> str:
    normalized = code.strip()
    if not normalized:
        raise ValueError("campaign code must not be blank")
    if len(normalized) > CAMPAIGN_CODE_MAX_LENGTH:
        raise ValueError(
            f"campaign code must not exceed {CAMPAIGN_CODE_MAX_LENGTH} characters"
        )
    return normalized

class CampaignsMixin:
    """Campaign CRUD."""

    # ------------------------------------------------------------------
    # Campaigns
    # ------------------------------------------------------------------
    async def create_campaign(
        self,
        *,
        code: str,
        display_name: str,
        description: str,
        actor_user_id: int | None,
        client_ip: str | None = None,
    ) -> CampaignRecord:
        normalized_code = _normalize_campaign_code(code)
        normalized_name = _normalize_display_name(display_name)
        now = _utc_now()
        async with self.database.begin() as connection:
            try:
                result = await connection.execute(
                    insert(campaigns).values(
                        code=normalized_code,
                        display_name=normalized_name,
                        description=description.strip(),
                        status=CampaignStatus.ACTIVE.value,
                        created_by_id=actor_user_id,
                        created_at=now,
                        updated_at=now,
                    )
                )
            except IntegrityError as error:
                raise ValueError(
                    f"a campaign with code {normalized_code!r} already exists"
                ) from error
            campaign_id = _inserted_id(result)
            # The creator becomes the campaign's first manager: someone
            # must own membership management from the first minute, and
            # migration 0019 derives the same rule for existing campaigns.
            if actor_user_id is not None:
                await connection.execute(
                    insert(campaign_members).values(
                        campaign_code=normalized_code,
                        user_id=actor_user_id,
                        role=CampaignMembershipRole.MANAGER.value,
                        granted_by_user_id=actor_user_id,
                        granted_at=now,
                        revoked_at=None,
                    )
                )
            await _add_audit_event(
                connection,
                actor_user_id=actor_user_id,
                action="campaign.create",
                entity_type="campaign",
                entity_id=str(campaign_id),
                details={"code": normalized_code},
                client_ip=client_ip,
            )
        return await self.get_campaign_by_id(campaign_id)

    async def get_campaign_by_id(self, campaign_id: int) -> CampaignRecord:
        async with self.database.engine.connect() as connection:
            row = (
                await connection.execute(
                    select(campaigns).where(campaigns.c.id == campaign_id)
                )
            ).mappings().one_or_none()
        if row is None:
            raise KeyError(f"unknown campaign id: {campaign_id}")
        return _campaign_record(row)

    async def get_campaign(self, code: str) -> CampaignRecord:
        normalized = _normalize_campaign_code(code)
        async with self.database.engine.connect() as connection:
            row = (
                await connection.execute(
                    select(campaigns).where(campaigns.c.code == normalized)
                )
            ).mappings().one_or_none()
        if row is None:
            raise KeyError(f"unknown campaign code: {normalized}")
        return _campaign_record(row)

    async def list_campaigns(
        self,
        *,
        statuses: Iterable[CampaignStatus] | None = None,
    ) -> list[CampaignRecord]:
        statement = select(campaigns).order_by(campaigns.c.code)
        if statuses is not None:
            values = [item.value for item in statuses]
            if not values:
                return []
            statement = statement.where(campaigns.c.status.in_(values))
        async with self.database.engine.connect() as connection:
            rows = (await connection.execute(statement)).mappings().all()
        return [_campaign_record(row) for row in rows]

    async def update_campaign(
        self,
        code: str,
        *,
        display_name: str | None = None,
        description: str | None = None,
        status: CampaignStatus | None = None,
        actor_user_id: int | None,
        client_ip: str | None = None,
    ) -> CampaignRecord:
        normalized_code = _normalize_campaign_code(code)
        values: dict[str, Any] = {"updated_at": _utc_now()}
        if display_name is not None:
            values["display_name"] = _normalize_display_name(display_name)
        if description is not None:
            values["description"] = description.strip()
        if status is not None:
            values["status"] = status.value
            if status in (CampaignStatus.CLOSED, CampaignStatus.ARCHIVED):
                values["closed_at"] = _utc_now()
            elif status == CampaignStatus.ACTIVE:
                values["closed_at"] = None
        async with self.database.begin() as connection:
            result = await connection.execute(
                update(campaigns)
                .where(campaigns.c.code == normalized_code)
                .values(**values)
            )
            if result.rowcount != 1:
                raise KeyError(f"unknown campaign code: {normalized_code}")
            await _add_audit_event(
                connection,
                actor_user_id=actor_user_id,
                action="campaign.update",
                entity_type="campaign",
                entity_id=normalized_code,
                details={k: str(v) for k, v in values.items()},
                client_ip=client_ip,
            )
        return await self.get_campaign(normalized_code)

    # ------------------------------------------------------------------
    # Campaign memberships
    # ------------------------------------------------------------------

    async def active_campaign_roles(
        self, user_id: int
    ) -> dict[str, CampaignMembershipRole]:
        """Active memberships of one user: campaign code -> role.

        Reads current rows on every call; revocation is visible to live
        sessions immediately.
        """
        async with self.database.engine.connect() as connection:
            try:
                rows = (
                    await connection.execute(
                        select(
                            campaign_members.c.campaign_code,
                            campaign_members.c.role,
                        ).where(
                            campaign_members.c.user_id == user_id,
                            campaign_members.c.revoked_at.is_(None),
                        )
                    )
                ).all()
            except (ProgrammingError, OperationalError) as error:
                # Pre-0019 schema: no memberships exist (see
                # _active_role_on); authorization degrades to system roles.
                if "campaign_members" not in str(
                    getattr(error, "orig", None) or error
                ):
                    raise
                return {}
        return {
            str(row.campaign_code): CampaignMembershipRole(str(row.role))
            for row in rows
        }

    async def campaign_role(
        self, campaign_code: str, user_id: int
    ) -> CampaignMembershipRole | None:
        normalized = _normalize_campaign_code(campaign_code)
        async with self.database.engine.connect() as connection:
            role = (
                await connection.execute(
                    select(campaign_members.c.role).where(
                        campaign_members.c.campaign_code == normalized,
                        campaign_members.c.user_id == user_id,
                        campaign_members.c.revoked_at.is_(None),
                    )
                )
            ).scalar_one_or_none()
        return CampaignMembershipRole(role) if role is not None else None

    async def list_campaign_members(
        self, campaign_code: str
    ) -> list[CampaignMemberRecord]:
        normalized = _normalize_campaign_code(campaign_code)
        statement = (
            select(
                campaign_members,
                users.c.username,
                users.c.display_name,
                users.c.role.label("system_role"),
            )
            .join(users, users.c.id == campaign_members.c.user_id)
            .where(
                campaign_members.c.campaign_code == normalized,
                campaign_members.c.revoked_at.is_(None),
            )
            .order_by(users.c.username)
        )
        async with self.database.engine.connect() as connection:
            rows = (await connection.execute(statement)).mappings().all()
        return [_member_record(row) for row in rows]

    async def set_campaign_member(
        self,
        campaign_code: str,
        user_id: int,
        *,
        role: CampaignMembershipRole,
        actor_user_id: int,
        client_ip: str | None = None,
    ) -> CampaignMemberRecord:
        """Grant or change one membership inside a single transaction.

        Re-granting a revoked membership is an explicit action and clears
        ``revoked_at``; the change is audited either way. The last active
        manager of a campaign can neither be demoted nor removed.
        """
        normalized = _normalize_campaign_code(campaign_code)
        now = _utc_now()
        async with self.database.begin() as connection:
            await _lock_campaign_row(connection, normalized)
            current = await connection_campaign_role(connection, normalized, user_id)
            if (
                current == CampaignMembershipRole.MANAGER
                and role != CampaignMembershipRole.MANAGER
            ):
                await _require_other_active_manager(connection, normalized, user_id)
            # Portable upsert: the campaign-row lock above serializes
            # concurrent membership mutations for this campaign, so an
            # UPDATE-then-INSERT sequence cannot race.
            updated = await connection.execute(
                update(campaign_members)
                .where(
                    campaign_members.c.campaign_code == normalized,
                    campaign_members.c.user_id == user_id,
                )
                .values(
                    role=role.value,
                    granted_by_user_id=actor_user_id,
                    granted_at=now,
                    revoked_at=None,
                )
            )
            if updated.rowcount == 0:
                await connection.execute(
                    insert(campaign_members).values(
                        campaign_code=normalized,
                        user_id=user_id,
                        role=role.value,
                        granted_by_user_id=actor_user_id,
                        granted_at=now,
                        revoked_at=None,
                    )
                )
            await _add_audit_event(
                connection,
                actor_user_id=actor_user_id,
                action="campaign.member_set",
                entity_type="campaign",
                entity_id=normalized,
                details={"user_id": user_id, "role": role.value},
                client_ip=client_ip,
            )
        members = [
            m
            for m in await self.list_campaign_members(normalized)
            if m.user_id == user_id
        ]
        if not members:
            raise KeyError(f"unknown campaign member: {user_id}")
        return members[0]

    async def remove_campaign_member(
        self,
        campaign_code: str,
        user_id: int,
        *,
        actor_user_id: int,
        client_ip: str | None = None,
    ) -> None:
        """Revoke one membership; the row stays for audit and provenance."""
        normalized = _normalize_campaign_code(campaign_code)
        now = _utc_now()
        async with self.database.begin() as connection:
            await _lock_campaign_row(connection, normalized)
            current = await connection_campaign_role(connection, normalized, user_id)
            if current is None:
                raise KeyError(f"unknown campaign member: {user_id}")
            if current == CampaignMembershipRole.MANAGER:
                await _require_other_active_manager(connection, normalized, user_id)
            result = await connection.execute(
                update(campaign_members)
                .where(
                    campaign_members.c.campaign_code == normalized,
                    campaign_members.c.user_id == user_id,
                    campaign_members.c.revoked_at.is_(None),
                )
                .values(revoked_at=now)
            )
            if result.rowcount != 1:
                raise KeyError(f"unknown campaign member: {user_id}")
            await _add_audit_event(
                connection,
                actor_user_id=actor_user_id,
                action="campaign.member_remove",
                entity_type="campaign",
                entity_id=normalized,
                details={"user_id": user_id},
                client_ip=client_ip,
            )


def _member_record(row: Mapping[str, Any]) -> CampaignMemberRecord:
    return CampaignMemberRecord(
        campaign_code=str(row["campaign_code"]),
        user_id=int(row["user_id"]),
        username=str(row["username"]),
        display_name=str(row["display_name"]),
        system_role=UserRole(str(row["system_role"])),
        role=CampaignMembershipRole(str(row["role"])),
        granted_by_user_id=row["granted_by_user_id"],
        granted_at=_as_utc(row["granted_at"]),
        revoked_at=_optional_utc(row["revoked_at"]),
    )


async def connection_campaign_role(
    connection: AsyncConnection, campaign_code: str, user_id: int
) -> CampaignMembershipRole | None:
    """Active membership role on the caller's transaction connection.

    In-transaction authorization checks (repository ``apply_*`` functions)
    use this so the decision rides the write's transaction. Below
    migration 0019 the campaign_members table does not exist, which
    truthfully means nobody holds a campaign role: authorization degrades
    to the system role and the experiment-owner boundary, exactly the
    behavior those schema revisions shipped with.
    """
    try:
        # The savepoint keeps the caller's transaction usable when the
        # table is absent: PostgreSQL aborts the whole transaction on a
        # failed statement, so swallowing the error alone is not enough.
        async with connection.begin_nested():
            role = (
                await connection.execute(
                    select(campaign_members.c.role).where(
                        campaign_members.c.campaign_code == campaign_code,
                        campaign_members.c.user_id == user_id,
                        campaign_members.c.revoked_at.is_(None),
                    )
                )
            ).scalar_one_or_none()
    except (ProgrammingError, OperationalError) as error:
        # A SELECT can only name campaign_members in its error when the
        # table itself is absent (PostgreSQL: relation does not exist;
        # SQLite: no such table). Any other failure propagates.
        if "campaign_members" not in str(getattr(error, "orig", None) or error):
            raise
        return None
    return CampaignMembershipRole(role) if role is not None else None


async def _lock_campaign_row(
    connection: AsyncConnection, campaign_code: str
) -> None:
    """Serialize membership mutations per campaign (FOR UPDATE on
    PostgreSQL; a no-op hint on SQLite, which serializes writers anyway)."""
    await connection.execute(
        select(campaigns.c.code)
        .where(campaigns.c.code == campaign_code)
        .with_for_update()
    )


async def _require_other_active_manager(
    connection: AsyncConnection, campaign_code: str, user_id: int
) -> None:
    others = (
        await connection.execute(
            select(campaign_members.c.user_id).where(
                campaign_members.c.campaign_code == campaign_code,
                campaign_members.c.user_id != user_id,
                campaign_members.c.role == CampaignMembershipRole.MANAGER.value,
                campaign_members.c.revoked_at.is_(None),
            )
        )
    ).first()
    if others is None:
        raise ValueError("at least one active campaign manager must remain")
