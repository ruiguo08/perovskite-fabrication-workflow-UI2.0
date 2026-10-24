"""Campaign directory and membership management.

Access follows docs/campaign-access-matrix.md: members see and manage their
campaigns; managers review and administer theirs; administrators see and
manage everything. Campaign creation keeps the instructor system-role gate
and the creator becomes the campaign's first manager.
"""

from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)

from ..access import validate_membership_role
from ..auth import (
    AuthContext,
    require_csrf,
    require_role,
    require_user,
)
from ..models import (
    CampaignCreatePayload,
    CampaignMemberPayload,
    CampaignMemberResponse,
    CampaignResponse,
    CampaignUpdatePayload,
)
from ..repository import (
    CampaignMembershipRole,
    CampaignStatus,
    UserRole,
    WebRepository,
)
from .common import (
    _actor_access,
    _campaign_response,
    _client_ip,
)


async def _resolve_member_user(repository: WebRepository, segment: str):
    """Resolve a member path segment: numeric id or exact username."""
    if segment.isdigit():
        try:
            return await repository.get_user(int(segment))
        except KeyError:
            return None
    return await repository.get_user_by_username(segment)


def _member_response(record) -> CampaignMemberResponse:
    return CampaignMemberResponse(
        user_id=record.user_id,
        username=record.username,
        display_name=record.display_name,
        system_role=record.system_role.value,
        role=record.role.value,
        granted_by_user_id=record.granted_by_user_id,
        granted_at=record.granted_at.isoformat(),
    )


def create_campaigns_router(
    repository: WebRepository,
    *,
    default_campaign_id: str | None,
) -> APIRouter:
    """Register the campaigns endpoints on a fresh router."""

    router = APIRouter(dependencies=[Depends(require_user)])

    @router.get("/api/campaigns", response_model=list[CampaignResponse])
    async def list_campaigns(
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> list[CampaignResponse]:
        """Campaigns the caller may see: own memberships, or all for
        administrators. A campaign the caller is not a member of does not
        appear — not even its existence."""
        access = await _actor_access(repository, auth_context)
        if access.visible_campaign_codes() is None:
            records = await repository.list_campaigns()
        else:
            records = [
                await repository.get_campaign(code)
                for code in sorted(access.visible_campaign_codes())
            ]
        return [
            CampaignResponse(
                **_campaign_response(record).model_dump(exclude={"my_role"}),
                my_role=access.role_in(record.code).value
                if access.role_in(record.code) is not None
                else None,
            )
            for record in records
        ]

    @router.post(
        "/api/campaigns",
        response_model=CampaignResponse,
        status_code=status.HTTP_201_CREATED,
        dependencies=[
            Depends(require_role(UserRole.INSTRUCTOR)),
            Depends(require_csrf),
        ],
    )
    async def create_campaign(
        request: Request,
        payload: CampaignCreatePayload,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> CampaignResponse:
        try:
            record = await repository.create_campaign(
                code=payload.code,
                display_name=payload.display_name,
                description=payload.description,
                actor_user_id=auth_context.user.id,
                client_ip=_client_ip(request),
            )
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(error),
            ) from error
        return _campaign_response(record)

    @router.patch(
        "/api/campaigns/{campaign_code}",
        response_model=CampaignResponse,
        dependencies=[Depends(require_csrf)],
    )
    async def update_campaign(
        request: Request,
        campaign_code: str,
        payload: CampaignUpdatePayload,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> CampaignResponse:
        if payload.status is not None and payload.status not in {
            CampaignStatus.ACTIVE.value,
            CampaignStatus.CLOSED.value,
            CampaignStatus.ARCHIVED.value,
        }:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="status must be one of: active, closed, archived",
            )
        access = await _actor_access(repository, auth_context)
        try:
            campaign = await repository.get_campaign(campaign_code)
        except KeyError as error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="campaign not found",
            ) from error
        if not access.can_view(campaign.code):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="campaign not found",
            )
        if not access.can_review_in(campaign.code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="campaign manager access is required to update the campaign",
            )
        try:
            record = await repository.update_campaign(
                campaign_code,
                display_name=payload.display_name,
                description=payload.description,
                status=CampaignStatus(payload.status) if payload.status else None,
                actor_user_id=auth_context.user.id,
                client_ip=_client_ip(request),
            )
        except KeyError as error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="campaign not found",
            ) from error
        return _campaign_response(record)

    @router.get(
        "/api/campaigns/{campaign_code}/members",
        response_model=list[CampaignMemberResponse],
    )
    async def list_campaign_members(
        campaign_code: str,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> list[CampaignMemberResponse]:
        access = await _actor_access(repository, auth_context)
        try:
            campaign = await repository.get_campaign(campaign_code)
        except KeyError as error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="campaign not found",
            ) from error
        if not access.can_view(campaign.code):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="campaign not found",
            )
        return [
            _member_response(record)
            for record in await repository.list_campaign_members(campaign.code)
        ]

    @router.put(
        "/api/campaigns/{campaign_code}/members/{user}",
        response_model=CampaignMemberResponse,
        dependencies=[Depends(require_csrf)],
    )
    async def set_campaign_member(
        request: Request,
        campaign_code: str,
        user: str,
        payload: CampaignMemberPayload,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> CampaignMemberResponse:
        """Grant or change one membership. The path segment is a numeric
        user id or a username (managers cannot enumerate accounts)."""
        access = await _actor_access(repository, auth_context)
        try:
            campaign = await repository.get_campaign(campaign_code)
        except KeyError as error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="campaign not found",
            ) from error
        if not access.can_view(campaign.code):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="campaign not found",
            )
        target = await _resolve_member_user(repository, user)
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="user not found",
            )
        user_id = target.id
        try:
            role = validate_membership_role(payload.role)
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(error),
            ) from error
        if not access.can_manage_members_in(campaign.code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="campaign manager access is required to manage members",
            )
        if (
            role == CampaignMembershipRole.MANAGER
            and not access.can_manage_managers_in(campaign.code)
        ):
            # A manager can never mint another manager — administrators only.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="only administrators can grant the campaign manager role",
            )
        try:
            record = await repository.set_campaign_member(
                campaign.code,
                user_id,
                role=role,
                actor_user_id=auth_context.user.id,
                client_ip=_client_ip(request),
            )
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(error),
            ) from error
        return _member_response(record)

    @router.delete(
        "/api/campaigns/{campaign_code}/members/{user}",
        status_code=status.HTTP_204_NO_CONTENT,
        dependencies=[Depends(require_csrf)],
    )
    async def remove_campaign_member(
        request: Request,
        campaign_code: str,
        user: str,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> None:
        access = await _actor_access(repository, auth_context)
        try:
            campaign = await repository.get_campaign(campaign_code)
        except KeyError as error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="campaign not found",
            ) from error
        if not access.can_view(campaign.code):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="campaign not found",
            )
        target = await _resolve_member_user(repository, user)
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="user not found",
            )
        user_id = target.id
        current = await repository.campaign_role(campaign.code, user_id)
        if not access.can_manage_members_in(campaign.code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="campaign manager access is required to manage members",
            )
        if (
            current == CampaignMembershipRole.MANAGER
            and not access.can_manage_managers_in(campaign.code)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="only administrators can remove a campaign manager",
            )
        try:
            await repository.remove_campaign_member(
                campaign.code,
                user_id,
                actor_user_id=auth_context.user.id,
                client_ip=_client_ip(request),
            )
        except KeyError as error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(error),
            ) from error
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(error),
            ) from error
    return router
