"""Application operations: experiment conditions and plan-status transitions.

Owns authorization (role-scoped experiment ownership), input and snapshot
validation, the transaction boundary (the connection-level ``apply_*`` data
functions in :mod:`web.repository.condition`), and the audit record. The
repository's public condition methods remain as deprecated no-pre-check
delegates for the historical exception contract; new callers go through
these operations.
"""

from __future__ import annotations

from typing import Any

from ..access import (
    ActorCampaignAccess,
    require_experiment_owner,
    require_experiment_visible,
)
from ..condition_snapshot import (
    canonical_hash as condition_canonical_hash,
)
from ..condition_snapshot import (
    validate_condition_snapshot,
)
from ..repository.condition import (
    StaleApprovalScope,
    apply_condition_create,
    apply_condition_delete,
    apply_condition_update,
    apply_plan_status_update,
    apply_substrate_exception_decision,
    apply_substrate_exception_request,
)
from ..repository.records import (
    ConditionRole,
    ExceptionDecision,
    PlanStatus,
)
from .errors import AccessDenied, InvalidInput, RecordNotFound, StateConflict


async def _require_condition_experiment_owner(
    repository, experiment_id: int, actor: ActorCampaignAccess
):
    """404 when invisible, 403 when visible but not the owner."""
    try:
        return await require_experiment_owner(
            repository, experiment_id, actor=actor
        )
    except KeyError as error:
        raise RecordNotFound(*error.args) from error
    except PermissionError as error:
        raise AccessDenied(str(error)) from error


async def create_condition(
    repository,
    *,
    experiment_id: int,
    role: ConditionRole | str,
    condition_code: str | None,
    condition_name: str,
    recipe_snapshot: dict[str, Any],
    source_baseline_version_id: int | None,
    device_layout_code: str,
    planned_substrate_count: int,
    requires_manual_review: bool = False,
    actor_user_id: int | None,
    client_ip: str | None = None,
    actor_access: ActorCampaignAccess | None = None,
):
    """Authorize, validate, and persist one new condition snapshot."""

    # --- Authorization ---------------------------------------------------
    # Access-provided callers keep the historical route order: existence and
    # access are checked before input validation (404 first, then the
    # owner-only 403). The delegate path (actor_access=None) skips
    # pre-check reads entirely and keeps the repository's historical
    # contract of reporting input problems first.
    if actor_access is not None:
        await _require_condition_experiment_owner(
            repository, experiment_id, actor_access
        )

    # --- Input and snapshot validation ---------------------------------
    normalized_role = ConditionRole(role)
    normalized_code = condition_code.strip() if condition_code else ""
    normalized_name = condition_name.strip()
    if not normalized_name:
        raise InvalidInput("condition name must not be blank")
    if planned_substrate_count < 1:
        raise InvalidInput("planned substrate count must be at least 1")
    try:
        normalized_snapshot = validate_condition_snapshot(recipe_snapshot)
    except (TypeError, ValueError) as error:
        raise InvalidInput(str(error)) from error
    snapshot_hash = condition_canonical_hash(normalized_snapshot)

    # --- Transaction -----------------------------------------------------
    try:
        async with repository.database.begin() as connection:
            condition_id = await apply_condition_create(
                connection,
                experiment_id=experiment_id,
                normalized_role=normalized_role,
                normalized_code=normalized_code,
                normalized_name=normalized_name,
                normalized_snapshot=normalized_snapshot,
                snapshot_hash=snapshot_hash,
                source_baseline_version_id=source_baseline_version_id,
                device_layout_code=device_layout_code,
                planned_substrate_count=planned_substrate_count,
                requires_manual_review=requires_manual_review,
                actor_user_id=actor_user_id,
                client_ip=client_ip,
            )
    except KeyError as error:
        raise RecordNotFound(*error.args) from error
    except ValueError as error:
        raise InvalidInput(str(error)) from error
    try:
        return await repository.get_condition(condition_id)
    except KeyError as error:
        # The readback runs after the commit; a concurrent delete must not
        # escape as an unhandled 500.
        raise RecordNotFound(*error.args) from error


async def update_condition(
    repository,
    condition_id: int,
    *,
    condition_name: str,
    recipe_snapshot: dict[str, Any],
    source_baseline_version_id: int | None,
    device_layout_code: str,
    planned_substrate_count: int,
    actor_user_id: int | None,
    client_ip: str | None = None,
    actor_access: ActorCampaignAccess | None = None,
):
    """Authorize, validate, and persist one condition edit."""

    # --- Authorization ---------------------------------------------------
    # Access-provided callers keep the historical route order: existence and
    # access are checked before input validation (404 first, then the
    # owner-only 403). The delegate path (actor_access=None) skips
    # pre-check reads entirely and keeps the repository's historical
    # contract of reporting input problems first.
    if actor_access is not None:
        try:
            condition = await repository.get_condition(condition_id)
        except KeyError as error:
            raise RecordNotFound(*error.args) from error
        await _require_condition_experiment_owner(
            repository, int(condition.experiment_id), actor_access
        )

    # --- Input and snapshot validation ---------------------------------
    normalized_name = condition_name.strip()
    if not normalized_name:
        raise InvalidInput("condition name must not be blank")
    if planned_substrate_count < 1:
        raise InvalidInput("planned substrate count must be at least 1")
    try:
        normalized_snapshot = validate_condition_snapshot(recipe_snapshot)
    except (TypeError, ValueError) as error:
        raise InvalidInput(str(error)) from error
    snapshot_hash = condition_canonical_hash(normalized_snapshot)

    # --- Transaction -----------------------------------------------------
    try:
        async with repository.database.begin() as connection:
            await apply_condition_update(
                connection,
                condition_id=condition_id,
                normalized_name=normalized_name,
                normalized_snapshot=normalized_snapshot,
                snapshot_hash=snapshot_hash,
                source_baseline_version_id=source_baseline_version_id,
                device_layout_code=device_layout_code,
                planned_substrate_count=planned_substrate_count,
                actor_user_id=actor_user_id,
                client_ip=client_ip,
            )
    except KeyError as error:
        raise RecordNotFound(*error.args) from error
    except ValueError as error:
        raise InvalidInput(str(error)) from error
    try:
        return await repository.get_condition(condition_id)
    except KeyError as error:
        # The readback runs after the commit; a concurrent delete must not
        # escape as an unhandled 500.
        raise RecordNotFound(*error.args) from error


async def delete_condition(
    repository,
    condition_id: int,
    *,
    actor_user_id: int | None,
    client_ip: str | None = None,
    actor_access: ActorCampaignAccess | None = None,
) -> None:
    """Authorize and delete one draft condition."""

    # --- Authorization -------------------------------------------------
    # Access-provided callers get existence + access before the
    # transaction; the delegate path goes straight to the apply function,
    # whose in-transaction check raises the historical KeyError lineage.
    if actor_access is not None:
        try:
            condition = await repository.get_condition(condition_id)
        except KeyError as error:
            raise RecordNotFound(*error.args) from error
        await _require_condition_experiment_owner(
            repository, int(condition.experiment_id), actor_access
        )

    # --- Transaction -----------------------------------------------------
    try:
        async with repository.database.begin() as connection:
            await apply_condition_delete(
                connection,
                condition_id=condition_id,
                actor_user_id=actor_user_id,
                client_ip=client_ip,
            )
    except KeyError as error:
        raise RecordNotFound(*error.args) from error
    except ValueError as error:
        raise InvalidInput(str(error)) from error


async def update_plan_status(
    repository,
    experiment_id: int,
    plan_status: PlanStatus,
    *,
    actor_user_id: int | None,
    client_ip: str | None = None,
    actor_access: ActorCampaignAccess | None = None,
    expected_approval_digest: str | None = None,
) -> None:
    """Authorize and apply one plan-status transition."""

    # --- Authorization -------------------------------------------------
    # Visibility only: the owner/reviewer split per transition is decided
    # by the in-transaction check (the authoritative gate).
    if actor_access is not None:
        try:
            await require_experiment_visible(
                repository, experiment_id, actor=actor_access
            )
        except KeyError as error:
            raise RecordNotFound(*error.args) from error

    # --- Transaction -----------------------------------------------------
    # The connection-level function re-checks the actor's role and the
    # plan's ownership inside the row lock (the authoritative check).
    try:
        async with repository.database.begin() as connection:
            await apply_plan_status_update(
                connection,
                experiment_id=experiment_id,
                plan_status=plan_status,
                actor_user_id=actor_user_id,
                client_ip=client_ip,
                expected_approval_digest=expected_approval_digest,
            )
    except KeyError as error:
        raise RecordNotFound(*error.args) from error
    except PermissionError as error:
        # The apply function's in-transaction role/ownership check refuses
        # students transitioning their own plan past draft (403, as the
        # historical route mapped it).
        raise AccessDenied(str(error)) from error
    except StaleApprovalScope as error:
        # Must precede the ValueError mapping: the stale-scope signal is a
        # ValueError subclass but means "review what you are approving
        # again" (409), not "malformed input" (400).
        raise StateConflict(str(error)) from error
    except ValueError as error:
        raise InvalidInput(str(error)) from error


async def request_substrate_exception(
    repository,
    *,
    condition_id: int,
    requested_count: int,
    reason: str,
    requested_by_id: int | None,
    client_ip: str | None = None,
    actor_access: ActorCampaignAccess | None = None,
):
    """Authorize, validate, and persist one substrate-count exception request."""

    # --- Authorization ---------------------------------------------------
    # Access-provided callers keep the historical route order: existence and
    # access are checked before input validation (404 first, then the
    # owner-only 403). The delegate path (actor_access=None) skips
    # pre-check reads entirely and keeps the repository's historical
    # contract of reporting input problems first.
    if actor_access is not None:
        try:
            condition = await repository.get_condition(condition_id)
        except KeyError as error:
            raise RecordNotFound(*error.args) from error
        await _require_condition_experiment_owner(
            repository, int(condition.experiment_id), actor_access
        )

    # --- Input validation -----------------------------------------------
    if not reason.strip():
        raise InvalidInput("exception reason must not be blank")
    if requested_count not in (1, 2):
        raise InvalidInput("a substrate exception may request only 1 or 2 substrates")

    # --- Transaction -----------------------------------------------------
    try:
        async with repository.database.begin() as connection:
            exception_id = await apply_substrate_exception_request(
                connection,
                condition_id=condition_id,
                requested_count=requested_count,
                reason=reason,
                requested_by_id=requested_by_id,
                client_ip=client_ip,
            )
    except KeyError as error:
        raise RecordNotFound(*error.args) from error
    except ValueError as error:
        raise InvalidInput(str(error)) from error
    try:
        return await repository.get_substrate_exception(exception_id)
    except KeyError as error:
        # The readback runs after the commit; a concurrent delete must not
        # escape as an unhandled 500.
        raise RecordNotFound(*error.args) from error


async def decide_substrate_exception(
    repository,
    exception_id: int,
    *,
    decision: ExceptionDecision,
    decided_by_id: int | None,
    decision_note: str = "",
    client_ip: str | None = None,
    actor_access: ActorCampaignAccess | None = None,
):
    """Authorize and record one reviewer decision on an exception.

    Reviewers are the campaign's managers and system administrators
    (docs/campaign-access-matrix.md); the apply function re-checks the
    reviewer standing inside the row lock (the authoritative gate).
    """

    # --- Authorization -------------------------------------------------
    if actor_access is not None:
        try:
            exception = await repository.get_substrate_exception(exception_id)
            condition = await repository.get_condition(int(exception.condition_id))
            experiment = await require_experiment_visible(
                repository, int(condition.experiment_id), actor=actor_access
            )
        except KeyError as error:
            raise RecordNotFound(*error.args) from error
        if not actor_access.can_review_in(experiment.campaign_id):
            raise AccessDenied(
                "campaign manager access is required to decide substrate exceptions"
            )

    # --- Input validation -----------------------------------------------
    # Validation first: the delegate path keeps the historical repository
    # contract of reporting input problems before any record read.
    if decision not in (ExceptionDecision.APPROVED, ExceptionDecision.REJECTED):
        raise InvalidInput("decision must be approved or rejected")

    # --- Transaction -----------------------------------------------------
    try:
        async with repository.database.begin() as connection:
            await apply_substrate_exception_decision(
                connection,
                exception_id=exception_id,
                decision=decision,
                decided_by_id=decided_by_id,
                decision_note=decision_note,
                client_ip=client_ip,
            )
    except KeyError as error:
        raise RecordNotFound(*error.args) from error
    except PermissionError as error:
        raise AccessDenied(str(error)) from error
    except ValueError as error:
        raise InvalidInput(str(error)) from error
    try:
        return await repository.get_substrate_exception(exception_id)
    except KeyError as error:
        # The readback runs after the commit; a concurrent delete must not
        # escape as an unhandled 500.
        raise RecordNotFound(*error.args) from error
