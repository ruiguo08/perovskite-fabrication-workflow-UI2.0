"""Campaign-analysis queries of :class:`web.repository.WebRepository`.

Read-only extraction for the campaign analysis workbench. The mixin owns the
actor-visible scope (students see only their own experiments inside the
campaign; instructors and administrators see the campaign), fetches every
input inside one repeatable-read transaction, and hands the raw rows to the
pure computation module :mod:`web.campaign_analysis`. No authorization
decision and no included/excluded record is made here — both come from the
same scoped queries, so unauthorized records can never influence counts,
diagnostics, summaries, or error messages.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, text

from .. import campaign_analysis as compute
from ..database import (
    campaigns,
    experiments,
    fabrication_batch_conditions,
    fabrication_batches,
    fabrication_devices,
    fabrication_substrates,
    process_execution_members,
    process_executions,
    result_device_assignments,
    result_files,
)
from ..jv_parser import _normalize_legacy_analysis


class CampaignAnalysisMixin:
    """Read-only campaign analysis extraction."""

    async def build_campaign_analysis(
        self,
        *,
        campaign_code: str,
        owner_user_id: int | None,
        representative: str = "latest",
        fabrication_batch_id: int | None = None,
    ) -> dict[str, Any]:
        """Assemble the campaign analysis payload for one actor.

        ``owner_user_id`` restricts students to their own experiments
        (``None`` keeps lab-wide visibility for elevated roles), mirroring
        the result-list scoping. Raises ``KeyError`` for an unknown campaign
        code and ``ValueError`` when the scope exceeds the documented result
        file bound. All rows come from one repeatable-read transaction so a
        concurrent upload cannot stitch two committed states together.
        """

        if representative not in compute.REPRESENTATIVE_RULES:
            raise ValueError(
                f"unknown representative rule: {representative!r} "
                f"(expected one of {', '.join(compute.REPRESENTATIVE_RULES)})"
            )
        normalized_code = campaign_code.strip()
        if not normalized_code:
            raise KeyError("unknown campaign code: ")
        async with self.database.begin() as connection:
            if connection.dialect.name == "postgresql":
                await connection.execute(
                    text(
                        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ "
                        "READ ONLY"
                    )
                )
            campaign_row = (
                await connection.execute(
                    select(
                        campaigns.c.code,
                        campaigns.c.display_name,
                        campaigns.c.status,
                    ).where(campaigns.c.code == normalized_code)
                )
            ).mappings().one_or_none()
            if campaign_row is None:
                raise KeyError(f"unknown campaign code: {normalized_code}")
            experiment_filters = [experiments.c.campaign_id == normalized_code]
            if owner_user_id is not None:
                experiment_filters.append(
                    experiments.c.created_by_id == owner_user_id
                )
            experiment_rows = (
                await connection.execute(
                    select(
                        experiments.c.id,
                        experiments.c.experiment_code,
                    )
                    .where(*experiment_filters)
                    .order_by(experiments.c.id)
                )
            ).mappings().all()
            experiment_ids = [int(row["id"]) for row in experiment_rows]
            experiment_codes = {
                int(row["id"]): row["experiment_code"] for row in experiment_rows
            }
            # Batches of the visible experiments only; an optional batch
            # filter narrows further but can never widen the scope.
            batch_filters = [
                fabrication_batches.c.experiment_id.in_(experiment_ids or [0])
            ]
            if fabrication_batch_id is not None:
                batch_filters.append(
                    fabrication_batches.c.id == fabrication_batch_id
                )
            batch_rows = (
                await connection.execute(
                    select(
                        fabrication_batches.c.id,
                        fabrication_batches.c.experiment_id,
                        fabrication_batches.c.batch_code,
                        fabrication_batches.c.status,
                    )
                    .where(*batch_filters)
                    .order_by(fabrication_batches.c.id)
                )
            ).mappings().all()
            batch_ids = [int(row["id"]) for row in batch_rows]
            condition_rows: list[Any] = []
            if batch_ids:
                condition_rows = (
                    (
                        await connection.execute(
                            select(
                                fabrication_batch_conditions.c.id,
                                fabrication_batch_conditions.c.fabrication_batch_id,
                                fabrication_batch_conditions.c.condition_code,
                                fabrication_batch_conditions.c.condition_name,
                                fabrication_batch_conditions.c.role,
                                fabrication_batch_conditions.c.source_condition_hash,
                                fabrication_batch_conditions.c.recipe_snapshot,
                                fabrication_batch_conditions.c.planned_substrate_count,
                                fabrication_batch_conditions.c.actual_substrate_count,
                            )
                            .where(
                                fabrication_batch_conditions.c.fabrication_batch_id.in_(
                                    batch_ids
                                )
                            )
                            .order_by(fabrication_batch_conditions.c.id)
                        )
                    )
                    .mappings()
                    .all()
                )
            file_rows: list[Any] = []
            if batch_ids:
                file_rows = (
                    (
                        await connection.execute(
                            select(
                                result_files.c.id,
                                result_files.c.experiment_id,
                                result_files.c.fabrication_batch_id,
                                result_files.c.filename,
                                result_files.c.sha256,
                                # The raw CSV content is deliberately not
                                # selected: analysis never needs the bytes,
                                # and loading them for a wide scope would be
                                # an unbounded read.
                                result_files.c.analysis,
                                result_files.c.analysis_schema_version,
                                result_files.c.created_at,
                            )
                            .where(
                                result_files.c.fabrication_batch_id.in_(batch_ids)
                            )
                            .order_by(result_files.c.id)
                        )
                    )
                    .mappings()
                    .all()
                )
            if len(file_rows) > compute.MAX_RESULT_FILES_PER_REQUEST:
                raise ValueError(
                    "campaign analysis scope covers "
                    f"{len(file_rows)} result files; the limit is "
                    f"{compute.MAX_RESULT_FILES_PER_REQUEST}. Narrow the "
                    "scope with a fabrication batch filter."
                )
            file_ids = [int(row["id"]) for row in file_rows]
            assignment_rows: list[Any] = []
            if file_ids:
                assignment_rows = (
                    (
                        await connection.execute(
                            select(
                                result_device_assignments.c.result_file_id,
                                result_device_assignments.c.analysis_device_id,
                                result_device_assignments.c.batch_condition_id,
                                result_device_assignments.c.fabrication_device_id,
                                fabrication_devices.c.device_code,
                                fabrication_substrates.c.id.label(
                                    "fabrication_substrate_id"
                                ),
                                fabrication_substrates.c.substrate_code,
                            )
                            .select_from(result_device_assignments)
                            .outerjoin(
                                fabrication_devices,
                                fabrication_devices.c.id
                                == result_device_assignments.c.fabrication_device_id,
                            )
                            .outerjoin(
                                fabrication_substrates,
                                fabrication_substrates.c.id
                                == fabrication_devices.c.substrate_id,
                            )
                            .where(
                                result_device_assignments.c.result_file_id.in_(
                                    file_ids
                                )
                            )
                            .order_by(result_device_assignments.c.id)
                        )
                    )
                    .mappings()
                    .all()
                )
            execution_rows: list[Any] = []
            if batch_ids:
                execution_rows = (
                    (
                        await connection.execute(
                            select(
                                process_execution_members.c.batch_condition_id,
                                process_execution_members.c.substrate_id,
                                process_executions.c.method,
                                process_executions.c.actual_process_snapshot,
                            )
                            .select_from(process_execution_members)
                            .join(
                                process_executions,
                                process_executions.c.id
                                == process_execution_members.c.process_execution_id,
                            )
                            .where(
                                process_execution_members.c.batch_condition_id.in_(
                                    [int(row["id"]) for row in condition_rows]
                                ),
                                process_executions.c.layer_type == "perovskite",
                                process_executions.c.method.in_(
                                    ("spin_coating", "vcd", "annealing")
                                ),
                                process_executions.c.actual_process_snapshot.isnot(
                                    None
                                ),
                            )
                            .order_by(process_execution_members.c.id)
                        )
                    )
                    .mappings()
                    .all()
                )
            analyses_by_id = {
                int(row["id"]): {
                    **row,
                    "analysis": _normalize_legacy_analysis(dict(row["analysis"] or {})),
                }
                for row in file_rows
            }
            assignments_by_file: dict[int, list[dict[str, Any]]] = {}
            for row in assignment_rows:
                assignments_by_file.setdefault(int(row["result_file_id"]), []).append(
                    dict(row)
                )
            return self._assemble_campaign_analysis(
                campaign_row=campaign_row,
                experiment_codes=experiment_codes,
                batch_rows=[dict(row) for row in batch_rows],
                condition_rows=[dict(row) for row in condition_rows],
                file_rows=[analyses_by_id[int(row["id"])] for row in file_rows],
                assignments_by_file=assignments_by_file,
                execution_rows=[dict(row) for row in execution_rows],
                representative=representative,
                fabrication_batch_id=fabrication_batch_id,
            )

    @staticmethod
    def _assemble_campaign_analysis(
        *,
        campaign_row: dict[str, Any],
        experiment_codes: dict[int, str],
        batch_rows: list[dict[str, Any]],
        condition_rows: list[dict[str, Any]],
        file_rows: list[dict[str, Any]],
        assignments_by_file: dict[int, list[dict[str, Any]]],
        execution_rows: list[dict[str, Any]],
        representative: str,
        fabrication_batch_id: int | None,
    ) -> dict[str, Any]:
        batch_status_by_id = {int(row["id"]): str(row["status"]) for row in batch_rows}
        batch_code_by_id = {int(row["id"]): str(row["batch_code"]) for row in batch_rows}
        experiment_by_batch = {
            int(row["id"]): int(row["experiment_id"]) for row in batch_rows
        }
        conditions = [
            {
                **row,
                "batch_id": int(row["fabrication_batch_id"]),
                "batch_code": batch_code_by_id.get(int(row["fabrication_batch_id"]), ""),
                "batch_status": batch_status_by_id.get(
                    int(row["fabrication_batch_id"]), ""
                ),
                "experiment_id": experiment_by_batch.get(
                    int(row["fabrication_batch_id"])
                ),
            }
            for row in condition_rows
        ]
        entries, diagnostics = compute.build_measurement_entries(
            file_rows=file_rows,
            assignments_by_file=assignments_by_file,
        )
        entries = compute.select_representatives(list(entries), representative)
        diagnostics = diagnostics + compute.missing_direction_diagnostics(entries)
        variants_by_condition = compute.group_actual_variants(execution_rows)
        variant_rows = compute.build_condition_variants(
            conditions, variants_by_condition
        )
        summaries = compute.build_summaries(
            condition_rows=conditions,
            condition_variant_rows=variant_rows,
            representative_entries=entries,
            representative_rule=representative,
        )
        comparisons, comparison_diagnostics = compute.build_comparisons(
            condition_rows=conditions,
            condition_variant_rows=variant_rows,
            representative_entries=entries,
        )
        coverage = compute.build_coverage(
            condition_rows=conditions,
            entries=entries,
        )
        flat_assignments = [
            {
                "result_file_id": int(assignment["result_file_id"]),
                "analysis_device_id": assignment["analysis_device_id"],
                "batch_condition_id": int(assignment["batch_condition_id"]),
                "fabrication_device_id": assignment["fabrication_device_id"],
            }
            for assignments in assignments_by_file.values()
            for assignment in assignments
        ]
        exclusions = [
            {
                "result_file_id": device["result_file_id"],
                "analysis_device_id": device["analysis_device_id"],
                "reason": device["reason"],
            }
            for diagnostic in diagnostics
            if diagnostic["code"] == "excluded-devices"
            for device in diagnostic.get("devices", [])
        ]
        representative_choices = [
            {
                "fabrication_device_id": entry["fabrication_device_id"],
                "direction": entry["direction"],
                "source_traces": entry["source_traces"],
            }
            for entry in entries
            if entry.get("representative")
        ]
        digest = compute.build_content_digest(
            scope={
                "campaign_code": campaign_row["code"],
                "fabrication_batch_id": fabrication_batch_id,
                "representative": representative,
            },
            condition_rows=conditions,
            file_rows=file_rows,
            assignments=flat_assignments,
            exclusions=exclusions,
            representative_choices=representative_choices,
            variant_rows=[
                {
                    **variant,
                    "batch_condition_id": row["batch_condition_id"],
                }
                for row in variant_rows
                for variant in row["variants"]
            ],
        )
        condition_codes = {int(row["id"]): row for row in conditions}
        measurements = [
            entry
            for entry in entries
            if int(entry["batch_condition_id"]) in condition_codes
        ]
        return {
            "campaign": {
                "code": str(campaign_row["code"]),
                "display_name": str(campaign_row["display_name"]),
                "status": str(campaign_row["status"]),
            },
            "scope": {
                "campaign_code": str(campaign_row["code"]),
                "fabrication_batch_id": fabrication_batch_id,
                "representative": representative,
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "content_digest": digest,
            "experiment_count": len(experiment_codes),
            "units": compute.metric_units(),
            "condition_directory": [
                {
                    "batch_condition_id": int(row["id"]),
                    "batch_id": int(row["fabrication_batch_id"]),
                    "batch_code": batch_code_by_id.get(
                        int(row["fabrication_batch_id"]), ""
                    ),
                    "experiment_id": experiment_by_batch.get(
                        int(row["fabrication_batch_id"])
                    ),
                    "experiment_code": experiment_codes.get(
                        experiment_by_batch.get(int(row["fabrication_batch_id"]))
                    ),
                    "condition_code": str(row["condition_code"]),
                    "condition_name": str(row["condition_name"]),
                    "role": str(row["role"]),
                }
                for row in condition_rows
            ],
            "conditions": variant_rows,
            "measurements": measurements,
            "summaries": summaries,
            "comparisons": comparisons,
            "coverage": coverage,
            "diagnostics": diagnostics + comparison_diagnostics,
            "limits": {
                "max_result_files_per_request": compute.MAX_RESULT_FILES_PER_REQUEST,
                "representative_rules": list(compute.REPRESENTATIVE_RULES),
            },
        }
