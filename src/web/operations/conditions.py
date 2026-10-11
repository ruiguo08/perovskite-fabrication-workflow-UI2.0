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
    ROLE_RANK,
    ConditionRole,
    ExceptionDecision,
    PlanStatus,
    UserRole,
)
from .errors import AccessDenied, InvalidInput, RecordNotFound, StateConflict


def _owner_scope(
    actor_role: UserRole | None, actor_user_id: int | None
) -> int | None:
    """Students are scoped to their own experiments; staff see the lab."""

    if actor_role is None:
        return None
    return actor_user_id if actor_role == UserRole.STUDENT else None


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
    actor_role: UserRole | None = None,
):
    """Authorize, validate, and persist one new condition snapshot."""

    # --- Authorization ---------------------------------------------------
    # Role-provided callers keep the historical route order: existence and
    # ownership are checked before input validation (404 first). The
    # delegate path (actor_role=None) skips pre-check reads entirely and
    # keeps the repository's historical contract of reporting input
    # problems first.
    if actor_role is not None:
        owner_scope = _owner_scope(actor_role, actor_user_id)
        try:
            await repository.get_experiment(experiment_id, owner_user_id=owner_scope)
        except KeyError as error:
            raise RecordNotFound(*error.args) from error

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
    actor_role: UserRole | None = None,
):
    """Authorize, validate, and persist one condition edit."""

    # --- Authorization ---------------------------------------------------
    # Role-provided callers keep the historical route order: existence and
    # ownership are checked before input validation (404 first). The
    # delegate path (actor_role=None) skips pre-check reads entirely and
    # keeps the repository's historical contract of reporting input
    # problems first.
    if actor_role is not None:
        try:
            condition = await repository.get_condition(condition_id)
        except KeyError as error:
            raise RecordNotFound(*error.args) from error
        owner_scope = _owner_scope(actor_role, actor_user_id)
        try:
            await repository.get_experiment(
                int(condition.experiment_id), owner_user_id=owner_scope
            )
        except KeyError as error:
            raise RecordNotFound(*error.args) from error

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
    actor_role: UserRole | None = None,
) -> None:
    """Authorize and delete one draft condition."""

    # --- Authorization -------------------------------------------------
    # Role-provided callers get existence + ownership before the
    # transaction; the delegate path goes straight to the apply function,
    # whose in-transaction check raises the historical KeyError lineage.
    if actor_role is not None:
        try:
            condition = await repository.get_condition(condition_id)
        except KeyError as error:
            raise RecordNotFound(*error.args) from error
        owner_scope = _owner_scope(actor_role, actor_user_id)
        try:
            await repository.get_experiment(
                int(condition.experiment_id), owner_user_id=owner_scope
            )
        except KeyError as error:
            raise RecordNotFound(*error.args) from error

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
    actor_role: UserRole | None = None,
    expected_approval_digest: str | None = None,
) -> None:
    """Authorize and apply one plan-status transition."""

    # --- Authorization -------------------------------------------------
    if actor_role is not None:
        owner_scope = _owner_scope(actor_role, actor_user_id)
        try:
            await repository.get_experiment(experiment_id, owner_user_id=owner_scope)
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
    actor_role: UserRole | None = None,
):
    """Authorize, validate, and persist one substrate-count exception request."""

    # --- Authorization ---------------------------------------------------
    # Role-provided callers keep the historical route order: existence and
    # ownership are checked before input validation (404 first). The
    # delegate path (actor_role=None) skips pre-check reads entirely and
    # keeps the repository's historical contract of reporting input
    # problems first.
    if actor_role is not None:
        try:
            condition = await repository.get_condition(condition_id)
        except KeyError as error:
            raise RecordNotFound(*error.args) from error
        owner_scope = _owner_scope(actor_role, requested_by_id)
        try:
            await repository.get_experiment(
                int(condition.experiment_id), owner_user_id=owner_scope
            )
        except KeyError as error:
            raise RecordNotFound(*error.args) from error

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
    actor_role: UserRole | None = None,
):
    """Authorize and record one instructor decision on an exception."""

    # --- Authorization -------------------------------------------------
    # The route also carries require_role(INSTRUCTOR); the operation checks
    # the role up front and the apply function re-checks it inside the row
    # lock (the authoritative gate).
    if actor_role is not None and ROLE_RANK[actor_role] < ROLE_RANK[UserRole.INSTRUCTOR]:
        raise AccessDenied("instructor access is required to decide substrate exceptions")

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
