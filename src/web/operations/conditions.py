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
    apply_condition_create,
    apply_condition_delete,
    apply_condition_update,
    apply_plan_status_update,
)
from ..repository.records import ConditionRole, PlanStatus, UserRole
from .errors import InvalidInput, RecordNotFound


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

    # --- Authorization -------------------------------------------------
    # A missing experiment and another student's experiment report the same
    # error so the response never reveals existence.
    if actor_role is not None:
        owner_scope = _owner_scope(actor_role, actor_user_id)
        try:
            await repository.get_experiment(experiment_id, owner_user_id=owner_scope)
        except KeyError as error:
            raise RecordNotFound(str(error)) from error

    # --- Input and snapshot validation ---------------------------------
    normalized_role = ConditionRole(role)
    normalized_code = condition_code.strip() if condition_code else ""
    normalized_name = condition_name.strip()
    if not normalized_name:
        raise InvalidInput("condition name must not be blank")
    if planned_substrate_count < 1:
        raise InvalidInput("planned substrate count must be at least 1")
    normalized_snapshot = validate_condition_snapshot(recipe_snapshot)
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
        raise RecordNotFound(str(error)) from error
    except ValueError as error:
        raise InvalidInput(str(error)) from error
    return await repository.get_condition(condition_id)


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

    # --- Authorization -------------------------------------------------
    try:
        condition = await repository.get_condition(condition_id)
    except KeyError as error:
        raise RecordNotFound(str(error)) from error
    if actor_role is not None:
        owner_scope = _owner_scope(actor_role, actor_user_id)
        try:
            await repository.get_experiment(
                int(condition.experiment_id), owner_user_id=owner_scope
            )
        except KeyError as error:
            raise RecordNotFound(str(error)) from error

    # --- Input and snapshot validation ---------------------------------
    normalized_name = condition_name.strip()
    if not normalized_name:
        raise InvalidInput("condition name must not be blank")
    if planned_substrate_count < 1:
        raise InvalidInput("planned substrate count must be at least 1")
    normalized_snapshot = validate_condition_snapshot(recipe_snapshot)
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
        raise RecordNotFound(str(error)) from error
    except ValueError as error:
        raise InvalidInput(str(error)) from error
    return await repository.get_condition(condition_id)


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
    try:
        condition = await repository.get_condition(condition_id)
    except KeyError as error:
        raise RecordNotFound(str(error)) from error
    if actor_role is not None:
        owner_scope = _owner_scope(actor_role, actor_user_id)
        try:
            await repository.get_experiment(
                int(condition.experiment_id), owner_user_id=owner_scope
            )
        except KeyError as error:
            raise RecordNotFound(str(error)) from error

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
        raise RecordNotFound(str(error)) from error
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
) -> None:
    """Authorize and apply one plan-status transition."""

    # --- Authorization -------------------------------------------------
    if actor_role is not None:
        owner_scope = _owner_scope(actor_role, actor_user_id)
        try:
            await repository.get_experiment(experiment_id, owner_user_id=owner_scope)
        except KeyError as error:
            raise RecordNotFound(str(error)) from error

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
            )
    except KeyError as error:
        raise RecordNotFound(str(error)) from error
    except ValueError as error:
        raise InvalidInput(str(error)) from error
