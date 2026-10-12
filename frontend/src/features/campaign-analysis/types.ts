/**
 * Types for the read-only campaign analysis API
 * (GET /api/campaigns/{code}/analysis).
 *
 * Kept inside the campaign-analysis feature so the shared api.ts types stay
 * untouched (parallel-work boundary). The shapes mirror the backend
 * response models in src/web/models_campaign_analysis.py.
 */

export type RepresentativeRule = "latest" | "mean";

export interface CampaignAnalysisScope {
  campaign_code: string;
  fabrication_batch_id: number | null;
  representative: RepresentativeRule;
}

export interface CampaignRef {
  code: string;
  display_name: string;
  status: string;
}

export interface DiagnosticDevice {
  result_file_id: number;
  analysis_device_id: string;
  reason: string;
  fabrication_device_id: number | null;
}

export interface CampaignDiagnostic {
  code: string;
  message: string;
  result_file_id: number | null;
  batch_condition_id: number | null;
  fabrication_device_id: number | null;
  /** Batch context of the comparison-skipped diagnostics. */
  batch_id?: number | null;
  devices?: DiagnosticDevice[];
  fabrication_device_ids?: number[];
  device_codes?: (string | null)[];
}

export interface SourceTrace {
  result_file_id: number;
  trace_id: string | null;
}

export interface MeasurementEntry {
  batch_condition_id: number;
  result_file_id: number | null;
  result_file_created_at: string | null;
  fabrication_device_id: number | null;
  fabrication_substrate_id: number | null;
  fabrication_substrate_code: string | null;
  fabrication_device_code: string | null;
  analysis_device_id: string;
  direction: string;
  metrics: Record<string, number | null>;
  hysteresis_index: number | null;
  trace_id: string | null;
  measured_at: string | null;
  metric_source: string | null;
  representative: boolean;
  measurement_count: number;
  source_result_file_ids: number[];
  source_traces: SourceTrace[];
}

export type ParameterOrigin = "actual" | "planned" | "not_executed";

export interface ConditionVariant {
  variant_index: number;
  feature_source: "actual" | "mixed" | "planned";
  features: Record<string, number | string | null>;
  parameter_origins: Record<string, ParameterOrigin>;
  fallback_reasons: Record<string, string>;
  actual_snapshot_hashes: Record<string, string>;
  substrate_ids: number[];
}

export interface ConditionVariants {
  batch_condition_id: number;
  planned_features: Record<string, number | string | null>;
  feature_note: string;
  variants: ConditionVariant[];
}

export interface SummaryMetrics {
  count: number;
  median: number | null;
  mean: number | null;
  min: number | null;
  max: number | null;
}

export interface SubstrateSummary {
  unit_count: number;
  mean: number | null;
}

export interface DirectionSummary {
  batch_condition_id: number;
  variant_index: number;
  feature_source: "actual" | "mixed" | "planned";
  direction: "forward" | "reverse";
  representative_rule: RepresentativeRule;
  device_count: number;
  substrate_count: number;
  measurement_count: number;
  metrics: Record<string, number | null>;
  device_statistics: Record<string, SummaryMetrics>;
  substrate_statistics: Record<string, SubstrateSummary>;
  pce_mean: number | null;
  pce_best: number | null;
}

export interface ControlTargetComparison {
  batch_id: number;
  control_batch_condition_id: number;
  target_batch_condition_id: number;
  direction: "forward" | "reverse";
  metric: string;
  control_mean: number;
  target_mean: number;
  difference: number;
  percent_change: number | null;
  n_control_units: number;
  n_target_units: number;
  inference_note: string;
}

export interface CoverageRow {
  batch_condition_id: number;
  measured_substrate_count: number;
  denominator_basis: "actual" | "planned";
  denominator_value: number;
  fraction: number | null;
  note: string;
}

export interface ConditionDirectoryEntry {
  batch_condition_id: number;
  batch_id: number;
  batch_code: string;
  experiment_id: number | null;
  experiment_code: string | null;
  condition_code: string;
  condition_name: string;
  role: string;
}

export interface CampaignAnalysis {
  rules_version: string;
  generated_at: string;
  content_digest: string;
  campaign: CampaignRef;
  scope: CampaignAnalysisScope;
  experiment_count: number;
  units: Record<string, string>;
  condition_directory: ConditionDirectoryEntry[];
  conditions: ConditionVariants[];
  measurements: MeasurementEntry[];
  summaries: DirectionSummary[];
  comparisons: ControlTargetComparison[];
  coverage: CoverageRow[];
  diagnostics: CampaignDiagnostic[];
  limits: {
    max_result_files_per_request: number;
    representative_rules: RepresentativeRule[];
  };
}
