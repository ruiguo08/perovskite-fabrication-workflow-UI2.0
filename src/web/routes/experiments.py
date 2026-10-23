"""Experiment plans: creation, conditions, plan lifecycle, and substrate exceptions."""

from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Request,
    status,
)
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool

from ..auth import (
    AuthContext,
    require_csrf,
    require_user,
)
from ..models import (
    ConditionCreatePayload,
    ConditionResponse,
    ConditionUpdatePayload,
    ExperimentDetailResponse,
    ExperimentResponse,
    PlanStatusUpdatePayload,
    RecipePayload,
    SubstrateExceptionCreatePayload,
    SubstrateExceptionDecisionPayload,
    SubstrateExceptionResponse,
)
from ..operations import conditions as condition_operations
from ..operations import experiment_creation as experiment_operations
from ..operations.errors import OperationError
from ..plan_export import (
    build_plan_export,
    canonical_plan_json,
    render_plan_pdf,
)
from ..repository import (
    ConditionRole,
    ExceptionDecision,
    PlanStatus,
    WebRepository,
)
from .common import (
    _actor_access,
    _client_ip,
    _condition_response,
    _fabrication_batch_response,
    _get_record_or_404,
    _operation_error_to_http,
    _record_response,
    _result_summary_response,
    _substrate_exception_response,
)


def create_experiments_router(
    repository: WebRepository,
    *,
    default_campaign_id: str | None,
) -> APIRouter:
    """Register the experiments endpoints on a fresh router."""

    router = APIRouter(dependencies=[Depends(require_user)])

    @router.get("/experiments/{experiment_id}/export.json")
    async def export_experiment_json(
        experiment_id: int,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> Response:
        record = await _get_record_or_404(repository, experiment_id, auth_context)
        payload = build_plan_export(
            record,
            await repository.list_conditions_for_experiment(experiment_id),
            await repository.list_substrate_exceptions_for_experiment(experiment_id),
        )
        return Response(
            content=canonical_plan_json(payload),
            media_type="application/json",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="experiment-{experiment_id}-plan.json"'
                )
            },
        )
    @router.get("/experiments/{experiment_id}/export.pdf")
    async def export_experiment_pdf(
        experiment_id: int,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> Response:
        record = await _get_record_or_404(repository, experiment_id, auth_context)
        payload = build_plan_export(
            record,
            await repository.list_conditions_for_experiment(experiment_id),
            await repository.list_substrate_exceptions_for_experiment(experiment_id),
        )
        content = await run_in_threadpool(render_plan_pdf, payload)
        return Response(
            content=content,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="experiment-{experiment_id}-plan.pdf"'
                )
            },
        )
    @router.post(
        "/api/experiments",
        response_model=ExperimentResponse,
        status_code=status.HTTP_201_CREATED,
        dependencies=[Depends(require_csrf)],
    )
    async def create_experiment_api(
        request: Request,
        payload: RecipePayload,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> ExperimentResponse:
        try:
            record = await experiment_operations.create_experiment(
                repository,
                recipe_values=payload.recipe.model_dump(mode="python"),
                campaign_id=(
                    payload.campaign_id
                    if payload.campaign_id is not None
                    else default_campaign_id
                ),
                source_baseline_version_id=payload.source_baseline_version_id,
                condition_plans=(
                    [item.model_dump(mode="python") for item in payload.condition_plans]
                    if payload.condition_plans is not None
                    else None
                ),
                actor_user_id=auth_context.user.id,
                client_ip=_client_ip(request),
                actor_access=await _actor_access(repository, auth_context),
            )
        except OperationError as error:
            raise _operation_error_to_http(error) from error
        return _record_response(record)
    @router.get("/api/experiments", response_model=list[ExperimentResponse])
    async def list_experiments_api(
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> list[ExperimentResponse]:
        # Membership-scoped listing: members see every experiment of
        # their campaigns (their own and peers'); administrators see all.
        access = await _actor_access(repository, auth_context)
        records = await repository.list_experiments(
            campaign_ids=access.visible_campaign_codes()
        )
        # Measured data pulled forward (D1): best forward-scan metrics per
        # experiment, empty for experiments without characterization results.
        best_metrics = await repository.best_scan_metrics_for_experiments(
            [record.id for record in records]
        )
        return [
            _record_response(record, best_metrics=best_metrics.get(record.id))
            for record in records
        ]
    @router.get(
        "/api/experiments/{experiment_id}",
        response_model=ExperimentDetailResponse,
    )
    async def get_experiment_detail_api(
        experiment_id: int,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> ExperimentDetailResponse:
        record = await _get_record_or_404(repository, experiment_id, auth_context)
        return ExperimentDetailResponse(
            approval_scope_digest=await repository.approval_scope_digest(
                experiment_id
            ),
            experiment=_record_response(record),
            conditions=[
                _condition_response(condition)
                for condition in await repository.list_conditions_for_experiment(
                    experiment_id
                )
            ],
            substrate_exceptions=[
                _substrate_exception_response(exception)
                for exception in await repository.list_active_substrate_exceptions_for_experiment(
                    experiment_id
                )
            ],
            fabrication_batches=[
                _fabrication_batch_response(batch)
                for batch in await repository.list_fabrication_batches_for_experiment(
                    experiment_id
                )
            ],
            results=[
                _result_summary_response(result)
                for result in await repository.list_results_for_experiment(
                    experiment_id
                )
            ],
        )
    @router.get(
        "/api/experiments/{experiment_id}/conditions",
        response_model=list[ConditionResponse],
    )
    async def list_conditions(
        experiment_id: int,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> list[ConditionResponse]:
        await _get_record_or_404(repository, experiment_id, auth_context)
        return [
            _condition_response(record)
            for record in await repository.list_conditions_for_experiment(
                experiment_id
            )
        ]
    @router.get(
        "/api/experiments/{experiment_id}/substrate-exceptions",
        response_model=list[SubstrateExceptionResponse],
    )
    async def list_substrate_exceptions(
        experiment_id: int,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> list[SubstrateExceptionResponse]:
        await _get_record_or_404(repository, experiment_id, auth_context)
        return [
            _substrate_exception_response(record)
            for record in await repository.list_active_substrate_exceptions_for_experiment(
                experiment_id
            )
        ]
    @router.post(
        "/api/experiments/{experiment_id}/conditions",
        response_model=ConditionResponse,
        status_code=status.HTTP_201_CREATED,
        dependencies=[Depends(require_csrf)],
    )
    async def create_condition(
        request: Request,
        experiment_id: int,
        payload: ConditionCreatePayload,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> ConditionResponse:
        try:
            record = await condition_operations.create_condition(
                repository,
                experiment_id=experiment_id,
                role=ConditionRole(payload.role),
                condition_code=None,
                condition_name=payload.condition_name,
                recipe_snapshot=payload.recipe_snapshot.model_dump(mode="python"),
                source_baseline_version_id=payload.source_baseline_version_id,
                device_layout_code=payload.device_layout_code,
                planned_substrate_count=payload.planned_substrate_count,
                actor_user_id=auth_context.user.id,
                client_ip=_client_ip(request),
                actor_access=await _actor_access(repository, auth_context),
            )
        except OperationError as error:
            raise _operation_error_to_http(error) from error
        return _condition_response(record)
    @router.put(
        "/api/conditions/{condition_id}",
        response_model=ConditionResponse,
        dependencies=[Depends(require_csrf)],
    )
    async def update_condition(
        request: Request,
        condition_id: int,
        payload: ConditionUpdatePayload,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> ConditionResponse:
        try:
            record = await condition_operations.update_condition(
                repository,
                condition_id,
                condition_name=payload.condition_name,
                recipe_snapshot=payload.recipe_snapshot.model_dump(mode="python"),
                source_baseline_version_id=payload.source_baseline_version_id,
                device_layout_code=payload.device_layout_code,
                planned_substrate_count=payload.planned_substrate_count,
                actor_user_id=auth_context.user.id,
                client_ip=_client_ip(request),
                actor_access=await _actor_access(repository, auth_context),
            )
        except OperationError as error:
            raise _operation_error_to_http(error) from error
        return _condition_response(record)
    @router.delete(
        "/api/conditions/{condition_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        dependencies=[Depends(require_csrf)],
    )
    async def delete_condition(
        request: Request,
        condition_id: int,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> None:
        try:
            await condition_operations.delete_condition(
                repository,
                condition_id,
                actor_user_id=auth_context.user.id,
                client_ip=_client_ip(request),
                actor_access=await _actor_access(repository, auth_context),
            )
        except OperationError as error:
            raise _operation_error_to_http(error) from error
    @router.post(
        "/api/conditions/{condition_id}/substrate-exceptions",
        response_model=SubstrateExceptionResponse,
        status_code=status.HTTP_201_CREATED,
        dependencies=[Depends(require_csrf)],
    )
    async def request_substrate_exception(
        request: Request,
        condition_id: int,
        payload: SubstrateExceptionCreatePayload,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> SubstrateExceptionResponse:
        try:
            record = await condition_operations.request_substrate_exception(
                repository,
                condition_id=condition_id,
                requested_count=payload.requested_count,
                reason=payload.reason,
                requested_by_id=auth_context.user.id,
                client_ip=_client_ip(request),
                actor_access=await _actor_access(repository, auth_context),
            )
        except OperationError as error:
            raise _operation_error_to_http(error) from error
        return _substrate_exception_response(record)
    @router.post(
        "/api/substrate-exceptions/{exception_id}/decision",
        response_model=SubstrateExceptionResponse,
        dependencies=[Depends(require_csrf)],
    )
    async def decide_substrate_exception(
        request: Request,
        exception_id: int,
        payload: SubstrateExceptionDecisionPayload,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> SubstrateExceptionResponse:
        try:
            record = await condition_operations.decide_substrate_exception(
                repository,
                exception_id,
                decision=ExceptionDecision(payload.decision),
                decided_by_id=auth_context.user.id,
                decision_note=payload.decision_note,
                client_ip=_client_ip(request),
                actor_access=await _actor_access(repository, auth_context),
            )
        except OperationError as error:
            raise _operation_error_to_http(error) from error
        return _substrate_exception_response(record)
    @router.patch(
        "/api/experiments/{experiment_id}/plan-status",
        status_code=status.HTTP_204_NO_CONTENT,
        dependencies=[Depends(require_csrf)],
    )
    async def update_plan_status(
        request: Request,
        experiment_id: int,
        payload: PlanStatusUpdatePayload,
        auth_context: Annotated[AuthContext, Depends(require_user)],
    ) -> None:
        try:
            await condition_operations.update_plan_status(
                repository,
                experiment_id,
                PlanStatus(payload.status),
                actor_user_id=auth_context.user.id,
                client_ip=_client_ip(request),
                actor_access=await _actor_access(repository, auth_context),
                expected_approval_digest=payload.expected_approval_digest,
            )
        except OperationError as error:
            raise _operation_error_to_http(error) from error
    return router
