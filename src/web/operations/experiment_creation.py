"""Application operation: experiment creation.

Owns campaign-state authorization, recipe validation, the transaction
boundary (:func:`web.repository.experiment.apply_experiment_create`), and
the audit record. The payload keeps the flat ``DepositionRecipe`` shape —
it is the creation API contract, materialized into structured condition
snapshots by :mod:`web.services.legacy_adapter`.
"""

from __future__ import annotations

from typing import Any, Mapping, Sequence

from perovskite_bo import DepositionRecipe

from ..access import ActorCampaignAccess
from ..repository.experiment import _normalize_campaign_id, apply_experiment_create
from .errors import AccessDenied, InvalidInput, RecordNotFound


async def create_experiment(
    repository,
    *,
    recipe_values: Mapping[str, Any],
    campaign_id: str | None,
    source_baseline_version_id: int | None = None,
    condition_plans: Sequence[Mapping[str, Any]] | None = None,
    actor_user_id: int | None,
    client_ip: str | None = None,
    actor_access: ActorCampaignAccess | None = None,
):
    """Validate, authorize, and persist one new experiment plan."""

    # --- Input validation -------------------------------------------------
    # The flat DepositionRecipe is the creation API contract; from_mapping
    # validates every field plus the embedded device_recipe, and to_dict()
    # emits the canonical form the apply function materializes. Expected
    # validation failures (bad ranges, malformed values) are typed so the
    # route reports 400 with the historical message instead of a 500.
    try:
        recipe = DepositionRecipe.from_mapping(dict(recipe_values))
    except (TypeError, ValueError) as error:
        raise InvalidInput(str(error)) from error
    normalized_values = recipe.to_dict()
    if not isinstance(normalized_values.get("device_recipe"), Mapping):
        raise InvalidInput(
            "a complete device_recipe is required; baselines and presets must be "
            "expanded before an experiment is saved"
        )

    # --- Authorization -----------------------------------------------------
    try:
        normalized_campaign_id = _normalize_campaign_id(campaign_id)
    except (TypeError, ValueError) as error:
        raise InvalidInput(str(error)) from error
    if normalized_campaign_id is None:
        raise InvalidInput("an active instructor-created campaign is required")

    # --- Campaign membership -----------------------------------------------
    # Creating an experiment requires an active participant or manager
    # membership of the campaign (administrators grant themselves a
    # membership first; the system role alone does not create data).
    # Non-members receive the uniform unknown-campaign denial.
    if actor_access is not None:
        # Existence and activity first, preserving the historical 400
        # contract for unknown/inactive campaign codes.
        try:
            campaign = await repository.get_campaign(normalized_campaign_id)
        except KeyError as error:
            raise InvalidInput(
                f"campaign {normalized_campaign_id!r} does not exist; "
                "an instructor must create it first"
            ) from error
        from ..repository.records import CampaignStatus

        if campaign.status != CampaignStatus.ACTIVE:
            raise InvalidInput(
                f"campaign {normalized_campaign_id!r} is not active"
            )
        if not actor_access.can_view(normalized_campaign_id):
            raise RecordNotFound(f"unknown campaign: {normalized_campaign_id}")
        if not actor_access.can_create_experiments_in(normalized_campaign_id):
            raise AccessDenied(
                "an active campaign membership with participant or manager "
                "role is required to create experiments"
            )

    # --- Transaction -------------------------------------------------------
    try:
        async with repository.database.begin() as connection:
            experiment_id = await apply_experiment_create(
                connection,
                recipe_values=normalized_values,
                normalized_campaign_id=normalized_campaign_id,
                source_baseline_version_id=source_baseline_version_id,
                condition_plans=condition_plans,
                actor_user_id=actor_user_id,
                client_ip=client_ip,
            )
    except KeyError as error:
        # The requested baseline version is outside the actor's source-use
        # boundary; report the uniform 404 so its existence is not leaked.
        raise RecordNotFound(*error.args) from error
    except ValueError as error:
        raise InvalidInput(str(error)) from error
    try:
        return await repository.get_experiment(experiment_id)
    except KeyError as error:
        # The readback runs after the commit; a concurrent delete must not
        # escape as an unhandled 500.
        raise RecordNotFound(*error.args) from error
