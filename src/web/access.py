"""Campaign-membership authorization shared by routes and operations.

Three independent layers decide access (see docs/campaign-access-matrix.md):
the system role, the fabrication workflow grant, and the per-campaign
membership. This module owns only the third layer plus its interaction with
the first. Every resolver reads current database rows — nothing about
membership is cached in a session, so revocation applies to already
authenticated users on their next request.

Denial policy: a resource the caller cannot *see* is a uniform 404 (the
caller is not a member of the campaign and not an administrator); a visible
resource the caller may not *change* is a 403. In-transaction checks inside
the repository ``apply_*`` functions repeat the same decision under the row
lock.
"""

from __future__ import annotations

from typing import Mapping

from .repository import (
    CAMPAIGN_MEMBERSHIP_ROLES,
    CampaignMembershipRole,
    UserRole,
    WebRepository,
)

MEMBERSHIP_RANK = {
    CampaignMembershipRole.READER: 1,
    CampaignMembershipRole.PARTICIPANT: 2,
    CampaignMembershipRole.MANAGER: 3,
}


class ActorCampaignAccess:
    """One authenticated user's resolved campaign standing."""

    def __init__(
        self,
        *,
        user_id: int,
        system_role: UserRole,
        memberships: Mapping[str, CampaignMembershipRole],
    ) -> None:
        self.user_id = user_id
        self.system_role = system_role
        self.memberships = dict(memberships)

    @property
    def is_administrator(self) -> bool:
        return self.system_role == UserRole.ADMINISTRATOR

    def role_in(self, campaign_code: str | None) -> CampaignMembershipRole | None:
        if campaign_code is None:
            return None
        return self.memberships.get(campaign_code)

    def can_view(self, campaign_code: str | None) -> bool:
        """Administrators read every campaign; anyone else needs a
        membership (any active role)."""
        if campaign_code is None:
            return self.is_administrator
        return self.is_administrator or campaign_code in self.memberships

    def visible_campaign_codes(self) -> frozenset[str] | None:
        """Campaign filter for listings; ``None`` means unrestricted
        (administrator). An empty set hides every campaign-scoped record."""
        if self.is_administrator:
            return None
        return frozenset(self.memberships)

    def can_create_experiments_in(self, campaign_code: str | None) -> bool:
        if campaign_code is None:
            return False
        role = self.role_in(campaign_code)
        return role in (CampaignMembershipRole.PARTICIPANT, CampaignMembershipRole.MANAGER)

    def can_review_in(self, campaign_code: str | None) -> bool:
        """Approve/release plans, decide exceptions, cancel batches."""
        if self.is_administrator:
            return True
        return self.role_in(campaign_code) == CampaignMembershipRole.MANAGER

    def can_manage_members_in(self, campaign_code: str | None) -> bool:
        """Manage reader/participant memberships (managers and admins)."""
        return self.can_review_in(campaign_code)

    def can_manage_managers_in(self, campaign_code: str | None) -> bool:
        """Grant or remove the manager role: administrators only — a
        manager can never mint another manager (no self-escalation)."""
        return self.is_administrator


async def resolve_access(
    repository: WebRepository, *, user_id: int, system_role: UserRole
) -> ActorCampaignAccess:
    memberships = await repository.active_campaign_roles(user_id)
    return ActorCampaignAccess(
        user_id=user_id, system_role=system_role, memberships=memberships
    )


def validate_membership_role(value: str) -> CampaignMembershipRole:
    if value not in CAMPAIGN_MEMBERSHIP_ROLES:
        raise ValueError("membership role must be one of: reader, participant, manager")
    return CampaignMembershipRole(value)


async def require_experiment_visible(
    repository: WebRepository,
    experiment_id: int,
    *,
    actor: ActorCampaignAccess,
):
    """Fetch one experiment the actor can see or raise KeyError (uniform
    404 at the HTTP boundary — non-members learn nothing about the record)."""
    record = await repository.get_experiment(experiment_id)
    if not actor.can_view(record.campaign_id):
        raise KeyError(f"unknown experiment id: {experiment_id}")
    return record


async def require_experiment_owner(
    repository: WebRepository,
    experiment_id: int,
    *,
    actor: ActorCampaignAccess,
):
    """Fetch one experiment for a content write.

    Raises KeyError (404) when the experiment is invisible and
    PermissionError (403) when it is visible but the actor is not the
    single owner — managers and administrators review; they do not edit
    members' experiment content.
    """
    record = await require_experiment_visible(repository, experiment_id, actor=actor)
    if record.created_by_id != actor.user_id:
        raise PermissionError(
            "only the experiment owner may modify this experiment's content"
        )
    return record
