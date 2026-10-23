"""Read-only campaign analysis endpoints for the analysis workbench."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..auth import AuthContext, require_user
from ..models_campaign_analysis import CampaignAnalysisResponse
from ..repository import WebRepository
from .common import _actor_access


def create_analysis_router(repository: WebRepository) -> APIRouter:
    """Register the analysis endpoints on a fresh router."""

    router = APIRouter(dependencies=[Depends(require_user)])

    @router.get(
        "/api/campaigns/{campaign_code}/analysis",
        response_model=CampaignAnalysisResponse,
    )
    async def get_campaign_analysis_api(
        auth_context: Annotated[AuthContext, Depends(require_user)],
        campaign_code: str,
        representative: str = Query(default="latest", pattern="^(latest|mean)$"),
        fabrication_batch_id: int | None = None,
    ) -> CampaignAnalysisResponse:
        """Read-only, membership-filtered campaign analysis payload.

        Active members of the campaign (any role) and administrators
        receive the whole campaign; everyone else gets the fixed 404 body
        (docs/campaign-access-matrix.md). An oversized scope returns 400
        naming the documented result-file bound. Unauthenticated or
        invisible records never influence counts, diagnostics, summaries,
        or error messages.
        """

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
        try:
            payload = await repository.build_campaign_analysis(
                campaign_code=campaign_code,
                owner_user_id=None,
                representative=representative,
                fabrication_batch_id=fabrication_batch_id,
            )
        except KeyError as error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="campaign not found",
            ) from error
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(error),
            ) from error
        return CampaignAnalysisResponse(**payload)

    return router
