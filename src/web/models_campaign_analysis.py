"""Response models for the read-only campaign analysis API.

Kept in a dedicated module (instead of the shared :mod:`web.models`) so the
campaign-analysis contract can evolve without touching the model file other
workstreams edit. Every model is a strict ``ApiModel`` subclass, so non-finite
numbers are rejected exactly like the rest of the API.
"""

from __future__ import annotations

from typing import Any

from pydantic import Field

from .campaign_analysis import (
    CAMPAIGN_ANALYSIS_RULES_VERSION,
    COVERAGE_NOTE,
    MAX_RESULT_FILES_PER_REQUEST,
    REPRESENTATIVE_RULES,
)
from .models import ApiModel

FeatureOrigin = Any  # "actual" | "planned" | "not_executed"
FeatureSource = Any  # "actual" | "mixed" | "planned"
ScanDirection = Any  # "forward" | "reverse"
RepresentativeRule = Any  # "latest" | "mean"


class CampaignRef(ApiModel):
    code: str
    display_name: str
    status: str


class CampaignAnalysisScope(ApiModel):
    campaign_code: str
    fabrication_batch_id: int | None = None
    representative: RepresentativeRule


class DiagnosticDevice(ApiModel):
    result_file_id: int
    analysis_device_id: str
    reason: str
    fabrication_device_id: int | None = None


class CampaignDiagnostic(ApiModel):
    code: str
    message: str
    result_file_id: int | None = None
    batch_condition_id: int | None = None
    fabrication_device_id: int | None = None
    # Batch context of the comparison-skipped diagnostics.
    batch_id: int | None = None
    devices: list[DiagnosticDevice] | None = None
    # Aggregated device lists for the missing-direction diagnostic.
    fabrication_device_ids: list[int] | None = None
    device_codes: list[str | None] | None = None


class SourceTrace(ApiModel):
    """One contributing (upload, trace) pair behind a representative."""

    result_file_id: int
    trace_id: str | None = None


class MeasurementEntry(ApiModel):
    """One measurement provenance row (one result file x device x direction).

    Raw re-measurements all appear here; only the entry carrying
    ``representative=True`` enters the summaries. A ``mean`` representative
    is a synthetic averaged entry with null source fields, every source
    file listed in ``source_result_file_ids``, and every contributing
    upload's exact trace in ``source_traces``.
    """

    batch_condition_id: int
    result_file_id: int | None = None
    result_file_created_at: str | None = None
    fabrication_device_id: int | None = None
    fabrication_substrate_id: int | None = None
    fabrication_substrate_code: str | None = None
    fabrication_device_code: str | None = None
    analysis_device_id: str
    direction: str
    metrics: dict[str, Any]
    hysteresis_index: float | None = None
    trace_id: str | None = None
    measured_at: str | None = None
    metric_source: str | None = None
    representative: bool
    measurement_count: int
    source_result_file_ids: list[int]
    source_traces: list[SourceTrace]


class ConditionVariants(ApiModel):
    batch_condition_id: int
    planned_features: dict[str, Any]
    feature_note: str
    variants: list[dict[str, Any]]


class SummaryMetrics(ApiModel):
    count: int
    median: float | None = None
    mean: float | None = None
    min: float | None = None
    max: float | None = None


class SubstrateSummary(ApiModel):
    unit_count: int
    mean: float | None = None


class DirectionSummary(ApiModel):
    batch_condition_id: int
    variant_index: int
    feature_source: FeatureSource
    direction: ScanDirection
    representative_rule: RepresentativeRule
    device_count: int
    substrate_count: int
    measurement_count: int
    metrics: dict[str, Any]
    device_statistics: dict[str, SummaryMetrics]
    substrate_statistics: dict[str, SubstrateSummary]
    pce_mean: float | None = None
    pce_best: float | None = None


class ControlTargetComparison(ApiModel):
    batch_id: int
    control_batch_condition_id: int
    target_batch_condition_id: int
    direction: ScanDirection
    metric: str
    control_mean: float
    target_mean: float
    difference: float
    percent_change: float | None = None
    n_control_units: int
    n_target_units: int
    inference_note: str


class CoverageRow(ApiModel):
    batch_condition_id: int
    measured_substrate_count: int
    denominator_basis: str  # "actual" | "planned"
    denominator_value: int
    fraction: float | None = None
    note: str = COVERAGE_NOTE


class ConditionDirectoryEntry(ApiModel):
    """Label context for every batch condition referenced by the payload."""

    batch_condition_id: int
    batch_id: int
    batch_code: str
    experiment_id: int | None = None
    experiment_code: str | None = None
    condition_code: str
    condition_name: str
    role: str


class CampaignAnalysisResponse(ApiModel):
    """Read-only campaign analysis payload.

    ``content_digest`` covers every input that influences the payload
    (scope, rules, source files with upload times, assignment and exclusion
    decisions, selected representative traces, snapshot hashes);
    ``generated_at`` is informational and never part of the digest.
    """

    rules_version: str = CAMPAIGN_ANALYSIS_RULES_VERSION
    generated_at: str
    content_digest: str
    campaign: CampaignRef
    scope: CampaignAnalysisScope
    experiment_count: int
    units: dict[str, str]
    condition_directory: list[ConditionDirectoryEntry]
    conditions: list[ConditionVariants]
    measurements: list[MeasurementEntry]
    summaries: list[DirectionSummary]
    comparisons: list[ControlTargetComparison]
    coverage: list[CoverageRow]
    diagnostics: list[CampaignDiagnostic]
    limits: dict[str, Any] = Field(
        default_factory=lambda: {
            "max_result_files_per_request": MAX_RESULT_FILES_PER_REQUEST,
            "representative_rules": list(REPRESENTATIVE_RULES),
        }
    )
