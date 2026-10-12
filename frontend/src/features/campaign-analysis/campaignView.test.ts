import { describe, expect, it } from "vitest";
import type { CampaignAnalysis } from "./types";
import {
  buildParameterRows,
  buildSummaryRows,
  describeCoverage,
  formatMetricValue,
  formatParameterValue,
  referencedResultFiles,
} from "./campaignView";

export function analysisFixture(
  overrides: Partial<CampaignAnalysis> = {},
): CampaignAnalysis {
  return {
    rules_version: "campaign-analysis-v1",
    generated_at: "2026-10-11T00:00:00+00:00",
    content_digest: "digest-abcdef0123456789",
    campaign: { code: "review", display_name: "Review", status: "active" },
    scope: { campaign_code: "review", fabrication_batch_id: null, representative: "latest" },
    experiment_count: 1,
    units: { ff: "fraction (0-1)", pce: "percent of 1 sun (mW/cm2 at 1 sun)" },
    condition_directory: [
      {
        batch_condition_id: 11,
        batch_id: 100,
        batch_code: "B1",
        experiment_id: 1,
        experiment_code: "Plan-1",
        condition_code: "C10",
        condition_name: "Control",
        role: "control",
      },
      {
        batch_condition_id: 12,
        batch_id: 100,
        batch_code: "B1",
        experiment_id: 1,
        experiment_code: "Plan-1",
        condition_code: "C11",
        condition_name: "Target",
        role: "target",
      },
    ],
    conditions: [
      {
        batch_condition_id: 11,
        planned_features: {
          spin_cast_rpm: 1000,
          spin_thin_rpm: 5000,
          vcd_stage1_pressure_pa: 100,
        },
        feature_note: "note",
        variants: [
          {
            variant_index: 0,
            feature_source: "mixed",
            features: {
              spin_cast_rpm: 4321,
              spin_thin_rpm: null,
              vcd_stage1_pressure_pa: 100,
            },
            parameter_origins: {
              spin_cast_rpm: "actual",
              spin_thin_rpm: "not_executed",
              vcd_stage1_pressure_pa: "planned",
            },
            fallback_reasons: { vcd_stage1_pressure_pa: "no actual snapshot" },
            actual_snapshot_hashes: { spin_coating: "hash" },
            substrate_ids: [1],
          },
        ],
      },
      {
        batch_condition_id: 12,
        planned_features: { spin_cast_rpm: 2000, vcd_stage1_pressure_pa: 100 },
        feature_note: "note",
        variants: [
          {
            variant_index: 0,
            feature_source: "planned",
            features: { spin_cast_rpm: 2000, vcd_stage1_pressure_pa: 100 },
            parameter_origins: { spin_cast_rpm: "planned", vcd_stage1_pressure_pa: "planned" },
            fallback_reasons: { "no-actual-snapshot": "none recorded" },
            actual_snapshot_hashes: {},
            substrate_ids: [],
          },
        ],
      },
    ],
    measurements: [
      {
        batch_condition_id: 11,
        result_file_id: 7,
        result_file_created_at: "2026-10-11T00:00:00+00:00",
        fabrication_device_id: 1,
        fabrication_substrate_id: 1,
        fabrication_substrate_code: "fab-S01",
        fabrication_device_code: "fab-S01-D01",
        analysis_device_id: "device-001",
        direction: "forward",
        metrics: { voc: 1.0, jsc: 20, ff: 0.25, pce: 5 },
        hysteresis_index: 0.1,
        trace_id: "trace-001",
        measured_at: null,
        metric_source: "summary table",
        representative: true,
        measurement_count: 2,
        source_result_file_ids: [7, 8],
        source_traces: [
          { result_file_id: 7, trace_id: "trace-001" },
          { result_file_id: 8, trace_id: "trace-002" },
        ],
      },
    ],
    summaries: [
      {
        batch_condition_id: 11,
        variant_index: 0,
        feature_source: "mixed",
        direction: "forward",
        representative_rule: "latest",
        device_count: 2,
        substrate_count: 1,
        measurement_count: 3,
        metrics: { voc: 1.0, jsc: 20, ff: 0.5, pce: 10 },
        device_statistics: {
          pce: { count: 2, median: 10, mean: 10, min: 9, max: 11 },
        },
        substrate_statistics: { pce: { unit_count: 1, mean: 10 } },
        pce_mean: 10,
        pce_best: 11,
      },
      {
        batch_condition_id: 11,
        variant_index: 0,
        feature_source: "mixed",
        direction: "reverse",
        representative_rule: "latest",
        device_count: 2,
        substrate_count: 1,
        measurement_count: 3,
        metrics: { voc: 1.0, jsc: 20, ff: 0.5, pce: 12 },
        device_statistics: {},
        substrate_statistics: { pce: { unit_count: 1, mean: 12 } },
        pce_mean: 12,
        pce_best: 12,
      },
      {
        // Parking planned variant: exists only in the summaries layer.
        batch_condition_id: 12,
        variant_index: 1,
        feature_source: "planned",
        direction: "forward",
        representative_rule: "latest",
        device_count: 1,
        substrate_count: 1,
        measurement_count: 1,
        metrics: { voc: 1.0, jsc: 20, ff: 0.5, pce: 30 },
        device_statistics: {},
        substrate_statistics: { pce: { unit_count: 1, mean: 30 } },
        pce_mean: 30,
        pce_best: 30,
      },
    ],
    comparisons: [
      {
        batch_id: 100,
        control_batch_condition_id: 11,
        target_batch_condition_id: 12,
        direction: "forward",
        metric: "pce",
        control_mean: 10,
        target_mean: 12,
        difference: 2,
        percent_change: 20,
        n_control_units: 1,
        n_target_units: 1,
        inference_note: "descriptive only",
      },
    ],
    coverage: [
      {
        batch_condition_id: 11,
        measured_substrate_count: 1,
        denominator_basis: "actual",
        denominator_value: 2,
        fraction: 0.5,
        note: "coverage note",
      },
    ],
    diagnostics: [
      {
        code: "missing-direction",
        message: "1 without a reverse scan",
        result_file_id: null,
        batch_condition_id: null,
        fabrication_device_id: null,
      },
    ],
    limits: { max_result_files_per_request: 100, representative_rules: ["latest", "mean"] },
    ...overrides,
  };
}

describe("campaignView", () => {
  it("converts the FF fraction to percent exactly once and formats units", () => {
    expect(formatMetricValue("ff", 0.25)).toBe("25.00%");
    expect(formatMetricValue("ff", null)).toBe("—");
    expect(formatMetricValue("pce", 10)).toBe("10.00%");
    expect(formatMetricValue("voc", 1.0)).toBe("1.000 V");
    expect(formatMetricValue("jsc", 20)).toBe("20.00 mA/cm²");
  });

  it("formats parameters with their declared unit and keeps nulls visible", () => {
    expect(formatParameterValue("spin_cast_rpm", 1000)).toBe("1000 rpm");
    expect(formatParameterValue("vcd_stage1_pressure_pa", 100)).toBe("100 Pa");
    expect(formatParameterValue("vcd_stage1_valve", "VV02")).toBe("VV02");
    expect(formatParameterValue("spin_cast_rpm", null)).toBe("—");
  });

  it("builds one summary row per condition variant with separate directions", () => {
    const rows = buildSummaryRows(analysisFixture());
    expect(rows).toHaveLength(3);
    expect(rows[0].conditionLabel).toBe("Plan-1/B1 · C10 (control)");
    expect(rows[0].forward?.pceMedian).toBe(10);
    expect(rows[0].reverse?.pceMedian).toBe(12);
    expect(rows[1].forward).toBeNull();
    // The parking planned variant exists only in the summaries layer and
    // must still render, clearly labeled as a planned fallback.
    expect(rows[2].variantLabel).toBe("Variant 2 · planned (planned fallback)");
    expect(rows[2].forward?.pceMedian).toBe(30);
  });

  it("shows effective values with origins and never restores unexecuted plan values", () => {
    const rows = buildParameterRows(analysisFixture());
    const spin = rows.find((row) => row.parameter === "spin_cast_rpm");
    expect(spin?.cells).toEqual([
      {
        effectiveText: "4321 rpm",
        origin: "actual",
        plannedText: "1000 rpm",
        deviates: true,
      },
      {
        effectiveText: "2000 rpm",
        origin: "planned",
        plannedText: "2000 rpm",
        deviates: false,
      },
    ]);
    expect(spin?.differs).toBe(true);
    expect(spin?.deviatesFromPlan).toBe(true);
  });

  it("keeps a not-executed step empty while the plan stays visible beside it", () => {
    const rows = buildParameterRows(analysisFixture());
    const thin = rows.find((row) => row.parameter === "spin_thin_rpm");
    expect(thin?.cells[0]).toEqual({
      effectiveText: "—",
      origin: "not_executed",
      plannedText: "5000 rpm",
      deviates: true,
    });
    expect(thin?.differs).toBe(false);
    expect(thin?.deviatesFromPlan).toBe(true);
  });

  it("describes coverage with the named denominator basis", () => {
    const coverage = describeCoverage(analysisFixture().coverage[0]);
    expect(coverage.label).toBe("1/2 measured (50%)");
    expect(coverage.title).toContain("actual substrate count");
  });

  it("collects unique referenced result files for source links", () => {
    const analysis = analysisFixture({
      diagnostics: [
        {
          code: "unbound-device",
          message: "device without binding",
          result_file_id: 9,
          batch_condition_id: null,
          fabrication_device_id: null,
        },
      ],
    });
    expect(referencedResultFiles(analysis)).toEqual([7, 8, 9]);
  });
});
