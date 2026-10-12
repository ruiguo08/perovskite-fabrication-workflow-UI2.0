/**
 * Pure view transforms for the campaign analysis panel.
 *
 * The backend owns every statistic; these helpers only format and arrange
 * the payload for display. The FF fraction-to-percent conversion happens
 * exactly once, here, and nowhere else in the rendering path.
 */

import type {
  CampaignAnalysis,
  ConditionVariants,
  ParameterOrigin,
} from "./types";

export function conditionDirectoryMap(
  analysis: CampaignAnalysis,
): Map<number, CampaignAnalysis["condition_directory"][number]> {
  return new Map(
    analysis.condition_directory.map((entry) => [entry.batch_condition_id, entry]),
  );
}

export function conditionLabel(
  entry: CampaignAnalysis["condition_directory"][number] | undefined,
  fallbackId: number,
): string {
  if (!entry) return `Condition ${fallbackId}`;
  return `${entry.experiment_code ?? "Unnamed experiment"}/${entry.batch_code} · ${entry.condition_code} (${entry.role})`;
}

export const METRIC_LABELS: Record<string, string> = {
  voc: "Voc",
  jsc: "Jsc",
  ff: "FF",
  pce: "PCE",
};

const PARAMETER_LABELS: Record<string, string> = {
  spin_cast_rpm: "Cast speed",
  spin_cast_seconds: "Cast duration",
  spin_cast_acceleration_rpm_per_s: "Cast acceleration",
  spin_spread_rpm: "Spread speed",
  spin_spread_seconds: "Spread duration",
  spin_spread_acceleration_rpm_per_s: "Spread acceleration",
  spin_thin_rpm: "Thin speed",
  spin_thin_seconds: "Thin duration",
  spin_thin_acceleration_rpm_per_s: "Thin acceleration",
  vcd_stage1_valve: "VCD stage 1 valve",
  vcd_stage1_pressure_pa: "VCD stage 1 pressure",
  vcd_stage1_seconds: "VCD stage 1 duration",
  vcd_stage2_valve: "VCD stage 2 valve",
  vcd_stage2_pressure_pa: "VCD stage 2 pressure",
  vcd_stage2_seconds: "VCD stage 2 duration",
  vcd_stage3_valve: "VCD stage 3 valve",
  vcd_stage3_pressure_pa: "VCD stage 3 pressure",
  vcd_stage3_seconds: "VCD stage 3 duration",
  anneal_1_temperature_c: "Anneal 1 temperature",
  anneal_1_seconds: "Anneal 1 duration",
};

const FEATURE_UNIT_LABELS: Record<string, string> = {
  rpm: "rpm",
  seconds: "s",
  acceleration_rpm_per_s: "rpm/s",
  pressure_pa: "Pa",
  temperature_c: "°C",
  valve: "",
};

/** Display string for one metric value; units come from the payload.
 * FF arrives as a fraction (0-1) and is converted to percent exactly once. */
export function formatMetricValue(metric: string, value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (metric === "ff") return `${(value * 100).toFixed(2)}%`;
  if (metric === "pce") return `${value.toFixed(2)}%`;
  if (metric === "voc") return `${value.toFixed(3)} V`;
  if (metric === "jsc") return `${value.toFixed(2)} mA/cm²`;
  return String(value);
}

/** Display string for one process parameter with its declared unit. */
export function formatParameterValue(
  name: string,
  value: number | string | null,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const unitKey = Object.keys(FEATURE_UNIT_LABELS).find((suffix) =>
    name.endsWith(suffix),
  );
  const unit = unitKey ? FEATURE_UNIT_LABELS[unitKey] : "";
  const text = String(value);
  return unit && Number.isFinite(Number(value)) ? `${text} ${unit}` : text;
}

export function parameterLabel(name: string): string {
  return PARAMETER_LABELS[name] ?? name.replace(/_/g, " ");
}

export const ORIGIN_MARKERS: Record<ParameterOrigin, string> = {
  actual: "actual",
  planned: "planned",
  not_executed: "not executed",
};

export interface VariantColumn {
  key: string;
  condition: ConditionVariants;
  variant: ConditionVariants["variants"][number];
  label: string;
}

/** One column per reported variant, in payload order. */
export function buildVariantColumns(analysis: CampaignAnalysis): VariantColumn[] {
  return analysis.conditions.flatMap((condition) =>
    condition.variants.map((variant) => ({
      key: `${condition.batch_condition_id}:${variant.variant_index}`,
      condition,
      variant,
      label: `Variant ${variant.variant_index + 1} · ${variant.feature_source}`,
    })),
  );
}

export interface ParameterCell {
  /** The effective value behind the statistics: the actual recorded value,
   * the frozen-plan fallback (origin "planned"), or "—" for a step the
   * execution never performed (origin "not_executed" — the plan value is
   * deliberately NOT restored here, mirroring the training export). */
  effectiveText: string;
  origin: ParameterOrigin | null;
  /** The frozen plan's value, always shown beside the effective value. */
  plannedText: string;
  /** Whether the effective value differs from this column's plan value. */
  deviates: boolean;
}

export interface ParameterRow {
  parameter: string;
  label: string;
  cells: ParameterCell[];
  /** Effective values differ between variant columns. */
  differs: boolean;
  /** Any column's effective value deviates from its frozen plan. */
  deviatesFromPlan: boolean;
}

/** Actual-versus-planned rows across all variant columns. Each variant
 * column carries an effective value and the frozen plan reference beside
 * it, so a planned fallback and a not-executed step can never be mistaken
 * for a recorded actual value. */
export function buildParameterRows(analysis: CampaignAnalysis): ParameterRow[] {
  const columns = buildVariantColumns(analysis);
  const names = [
    ...new Set(
      analysis.conditions.flatMap((condition) => [
        ...Object.keys(condition.planned_features),
        ...condition.variants.flatMap((variant) => Object.keys(variant.features)),
      ]),
    ),
  ];
  return names.map((parameter) => {
    const cells = columns.map((column) => {
      const origin = column.variant.parameter_origins[parameter] ?? null;
      const plannedRaw = column.condition.planned_features[parameter] ?? null;
      const plannedText = formatParameterValue(parameter, plannedRaw);
      let effectiveRaw: number | string | null;
      if (origin === "not_executed") {
        // The method ran but the plan step is absent from the actual
        // record: keep the value empty instead of restoring the plan.
        effectiveRaw = null;
      } else if (origin === "planned") {
        effectiveRaw = plannedRaw;
      } else {
        effectiveRaw = column.variant.features[parameter] ?? null;
      }
      const effectiveText = formatParameterValue(parameter, effectiveRaw);
      return {
        effectiveText,
        origin,
        plannedText,
        deviates: effectiveText !== plannedText,
      };
    });
    const present = new Set(cells.map((cell) => cell.effectiveText));
    return {
      parameter,
      label: parameterLabel(parameter),
      cells,
      differs: present.size > 1,
      deviatesFromPlan: cells.some((cell) => cell.deviates),
    };
  });
}

export interface SummaryRow {
  key: string;
  conditionLabel: string;
  variantLabel: string;
  forward: DirectionCells | null;
  reverse: DirectionCells | null;
}

export interface DirectionCells {
  deviceCount: number;
  substrateCount: number;
  measurementCount: number;
  pceMedian: number | null;
  pceBest: number | null;
  vocMedian: number | null;
  jscMedian: number | null;
  ffMedian: number | null;
  substrateMeanPce: number | null;
  substrateUnits: number;
}

function directionCells(
  summary: CampaignAnalysis["summaries"][number],
): DirectionCells {
  const substrate = summary.substrate_statistics.pce;
  return {
    deviceCount: summary.device_count,
    substrateCount: summary.substrate_count,
    measurementCount: summary.measurement_count,
    pceMedian: summary.metrics.pce,
    pceBest: summary.pce_best,
    vocMedian: summary.metrics.voc,
    jscMedian: summary.metrics.jsc,
    ffMedian: summary.metrics.ff,
    substrateMeanPce: substrate ? substrate.mean : null,
    substrateUnits: substrate ? substrate.unit_count : 0,
  };
}

/** One row per (condition, variant) with separate forward/reverse cells.
 * Rows without any direction summary are still listed so unmeasured
 * conditions remain visible with empty cells — and parking planned
 * variants (which the backend only emits in the summaries layer, for
 * measurements whose substrate has no recorded actual snapshot) are
 * appended so those measurements are never hidden. */
export function buildSummaryRows(analysis: CampaignAnalysis): SummaryRow[] {
  const directory = conditionDirectoryMap(analysis);
  const grouped = new Map<
    string,
    { forward: DirectionCells | null; reverse: DirectionCells | null }
  >();
  for (const summary of analysis.summaries) {
    const key = `${summary.batch_condition_id}:${summary.variant_index}`;
    const row = grouped.get(key) ?? { forward: null, reverse: null };
    row[summary.direction] = directionCells(summary);
    grouped.set(key, row);
  }
  const rows: SummaryRow[] = [];
  const seen = new Set<string>();
  for (const condition of analysis.conditions) {
    for (const variant of condition.variants) {
      const key = `${condition.batch_condition_id}:${variant.variant_index}`;
      seen.add(key);
      const cells = grouped.get(key) ?? { forward: null, reverse: null };
      rows.push({
        key,
        conditionLabel: conditionLabel(
          directory.get(condition.batch_condition_id),
          condition.batch_condition_id,
        ),
        variantLabel:
          condition.variants.length > 1
            ? `Variant ${variant.variant_index + 1} · ${variant.feature_source}`
            : variant.feature_source,
        forward: cells.forward,
        reverse: cells.reverse,
      });
    }
  }
  for (const summary of analysis.summaries) {
    const key = `${summary.batch_condition_id}:${summary.variant_index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cells = grouped.get(key) ?? { forward: null, reverse: null };
    rows.push({
      key,
      conditionLabel: conditionLabel(
        directory.get(summary.batch_condition_id),
        summary.batch_condition_id,
      ),
      variantLabel: `Variant ${summary.variant_index + 1} · ${summary.feature_source} (planned fallback)`,
      forward: cells.forward,
      reverse: cells.reverse,
    });
  }
  return rows;
}

export interface CoverageDisplay {
  label: string;
  title: string;
}

export function describeCoverage(coverage: CampaignAnalysis["coverage"][number]): CoverageDisplay {
  const denominator =
    coverage.denominator_value > 0 ? coverage.denominator_value : 0;
  const percent =
    coverage.fraction === null ? null : Math.round(coverage.fraction * 100);
  return {
    label: `${coverage.measured_substrate_count}/${denominator} measured (${percent === null ? "—" : `${percent}%`})`,
    title: `Denominator basis: ${coverage.denominator_basis} substrate count (${coverage.denominator_value}). ${coverage.note}`,
  };
}

/** Unique result-file ids referenced by the payload, ascending. */
export function referencedResultFiles(analysis: CampaignAnalysis): number[] {
  const ids = new Set<number>();
  for (const entry of analysis.measurements) {
    for (const id of entry.source_result_file_ids) ids.add(id);
  }
  for (const diagnostic of analysis.diagnostics) {
    if (diagnostic.result_file_id !== null) ids.add(diagnostic.result_file_id);
    for (const device of diagnostic.devices ?? []) {
      ids.add(device.result_file_id);
    }
  }
  return [...ids].sort((left, right) => left - right);
}

export function shortDigest(digest: string): string {
  return digest.slice(0, 12);
}
