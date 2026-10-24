"""Application operation: fabrication-batch lifecycle status transitions.

Owns the existence pre-checks, role-scoped ownership authorization, the
transaction boundary, and error translation for moving a fabrication batch
through its status machine — including completion, which records actual
substrate counts, shortfall deviations, and materialized substrates
atomically (see :func:`web.repository.batch.apply_batch_status_update`).
"""

from __future__ import annotations

from typing import Mapping, Sequence

from ..access import ActorCampaignAccess, require_experiment_visible
from ..repository.batch import apply_batch_status_update
from ..repository.records import BatchStatus, FabricationBatchRecord
from .errors import AccessDenied, InvalidInput, RecordNotFound


async def update_batch_status(
    repository,
    *,
    batch_id: int,
    status: BatchStatus,
    actor_user_id: int,
    client_ip: str | None = None,
    actual_substrate_counts: Mapping[int, int] | None = None,
    shortfall_deviations: Sequence[tuple[int, str]] | None = None,
    actor_access: ActorCampaignAccess | None,
) -> FabricationBatchRecord:
    """Authorize and apply one batch status transition.

    ``actor_access`` is the caller's resolved campaign standing; ``None`` is
    only used by the deprecated repository delegate, which keeps that
    method's original no-pre-check semantics (the transaction still
    enforces ownership and reviewer standing through the batch row lock).
    """

    # --- Existence and visibility pre-checks ----------------------------
    # A missing batch and a batch the caller cannot see report the same
    # error so the response never reveals existence. The owner/reviewer
    # split for the transition itself is the in-transaction check.
    try:
        batch = await repository.get_fabrication_batch(batch_id)
    except KeyError as error:
        raise RecordNotFound(*error.args) from error
    if actor_access is not None:
        try:
            await require_experiment_visible(
                repository, int(batch.experiment_id), actor=actor_access
            )
        except KeyError as error:
            raise RecordNotFound(*error.args) from error

    # --- Transaction -----------------------------------------------------
    try:
        async with repository.database.begin() as connection:
            await apply_batch_status_update(
                connection,
                batch_id=batch_id,
                status=status,
                actor_user_id=actor_user_id,
                client_ip=client_ip,
                actual_substrate_counts=actual_substrate_counts,
                shortfall_deviations=shortfall_deviations,
            )
    except PermissionError as error:
        raise AccessDenied(str(error)) from error
    except ValueError as error:
        raise InvalidInput(str(error)) from error
    except KeyError as error:
        raise RecordNotFound(*error.args) from error
    try:
        return await repository.get_fabrication_batch(batch_id)
    except KeyError as error:
        # The readback runs after the commit; a concurrent delete must not
        # escape as an unhandled 500.
        raise RecordNotFound(*error.args) from error
