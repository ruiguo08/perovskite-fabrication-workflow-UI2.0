"""Read-only campaign analysis endpoints for the analysis workbench."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..auth import AuthContext, require_user
from ..models_campaign_analysis import CampaignAnalysisResponse
from ..repository import WebRepository
from .common import _student_owner_id


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
        """Read-only, permission-filtered campaign analysis payload.

        Students receive only their own experiments inside the campaign;
        instructors and administrators receive the campaign. An unknown
        campaign returns the fixed 404 body; an oversized scope returns 400
        naming the documented result-file bound. Unauthenticated or
        invisible records never influence counts, diagnostics, summaries,
        or error messages.
        """

        try:
            payload = await repository.build_campaign_analysis(
                campaign_code=campaign_code,
                owner_user_id=_student_owner_id(auth_context),
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
