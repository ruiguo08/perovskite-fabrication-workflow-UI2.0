import { describe, expect, it } from "vitest";
import type { DeviceLayer, PerovskiteDepositionProcess } from "../../types/api";
import { diffPresetSnapshots, formatDiffValue } from "./presetDiff";

const baseLayer: DeviceLayer = {
  layer_type: "sam",
  role: "htl",
  name: "2PACz",
  preset_id: "sam_spin_v1",
  solution: {
    formulation_type: "weighed_solids",
    stock_dispersion: "",
    stock_volume_ml: null,
    solids: [{ chemical: "2PACz", weight_mg: 1 }],
    solvents: [{ solvent: "ethanol", volume_ml: 1 }],
  },
  process: {
    method: "spin_coating",
    spin_steps: [{ rpm: 3000, seconds: 30, acceleration_rpm_per_s: 1000 }],
    anneal_steps: [{ temperature_c: 100, seconds: 600 }],
  },
};

const baseProcess: PerovskiteDepositionProcess = {
  method: "spin_coating_vcd",
  spin_steps: [{ rpm: 1000, seconds: 10, acceleration_rpm_per_s: 100 }],
  vcd_stages: [{ valve: "VV02", pressure_pa: 900, seconds: 10 }],
  gas_backfill_stages: [],
  vcd_step_sequence: ["vcd_stage1"],
  anneal_steps: [{ temperature_c: 100, seconds: 60 }],
};

function entry(result: ReturnType<typeof diffPresetSnapshots>, path: string) {
  const found = result.entries.find((candidate) => candidate.path === path);
  expect(found, `expected a diff entry at ${path}`).toBeDefined();
  return found!;
}

describe("diffPresetSnapshots", () => {
  it("reports identical snapshots as identical", () => {
    const result = diffPresetSnapshots(
      { layer: baseLayer, deposition_process: null },
      { layer: baseLayer, deposition_process: null },
    );
    expect(result.identical).toBe(true);
    expect(result.entries).toEqual([]);
  });

  it("detects numeric changes and keeps zero distinct from null", () => {
    const changedLayer = {
      ...baseLayer,
      solution: {
        ...baseLayer.solution!,
        solids: [{ chemical: "2PACz", weight_mg: 2.5 }],
      },
    };
    const result = diffPresetSnapshots(
      { layer: baseLayer, deposition_process: null },
      { layer: changedLayer, deposition_process: null },
    );
    const weight = entry(result, "layer.solution.solids.0.weight_mg");
    expect(weight.kind).toBe("changed");
    expect(weight.left).toBe(1);
    expect(weight.right).toBe(2.5);

    const zeroed = diffPresetSnapshots(
      { layer: baseLayer, deposition_process: null },
      { layer: { ...baseLayer, solution: { ...baseLayer.solution!, solids: [{ chemical: "2PACz", weight_mg: 0 }] } }, deposition_process: null },
    );
    expect(entry(zeroed, "layer.solution.solids.0.weight_mg").right).toBe(0);
  });

  it("reports null and empty-string values explicitly", () => {
    const removedSolution = { ...baseLayer, solution: null };
    const result = diffPresetSnapshots(
      { layer: baseLayer, deposition_process: null },
      { layer: removedSolution, deposition_process: null },
    );
    expect(entry(result, "layer.solution.solids.0.chemical").kind).toBe("removed");
    expect(entry(result, "layer.solution.formulation_type").kind).toBe("removed");
    expect(entry(result, "layer.solution.solids.0.chemical").left).toBe("2PACz");
  });

  it("adds field-level entries when a formulation appears", () => {
    const result = diffPresetSnapshots(
      { layer: { ...baseLayer, solution: null }, deposition_process: null },
      { layer: baseLayer, deposition_process: null },
    );
    expect(entry(result, "layer.solution.formulation_type").kind).toBe("added");
    expect(entry(result, "layer.solution.solids.0.weight_mg").kind).toBe("added");
  });

  it("preserves VCD stage order and surfaces reorders as positional changes", () => {
    const reordered: PerovskiteDepositionProcess = {
      ...baseProcess,
      gas_backfill_stages: [{ gas: "N2", flow_sccm: 20, target_pressure_pa: 500, hold_seconds: 5 }],
      vcd_step_sequence: ["gas_backfill_stage1", "vcd_stage1"],
    };
    const original: PerovskiteDepositionProcess = {
      ...baseProcess,
      gas_backfill_stages: [{ gas: "N2", flow_sccm: 20, target_pressure_pa: 500, hold_seconds: 5 }],
      vcd_step_sequence: ["vcd_stage1", "gas_backfill_stage1"],
    };
    const result = diffPresetSnapshots(
      { layer: baseLayer, deposition_process: original },
      { layer: baseLayer, deposition_process: reordered },
    );
    const step1 = entry(result, "deposition_process.vcd_step_sequence.0");
    expect(step1.kind).toBe("changed");
    expect(step1.left).toBe("vcd_stage1");
    expect(step1.right).toBe("gas_backfill_stage1");
    // Stage arrays themselves are unchanged — only the program order moved.
    expect(result.entries.filter((candidate) => candidate.path.startsWith("deposition_process.vcd_stages"))).toEqual([]);
  });

  it("separates identity metadata from scientific content groups", () => {
    const renamed = { ...baseLayer, name: "2PACz MEA" };
    const result = diffPresetSnapshots(
      { layer: baseLayer, deposition_process: null },
      { layer: renamed, deposition_process: null },
    );
    expect(entry(result, "layer.name").group).toBe("identity");
    const weightResult = diffPresetSnapshots(
      { layer: baseLayer, deposition_process: null },
      { layer: { ...baseLayer, solution: { ...baseLayer.solution!, solids: [{ chemical: "2PACz", weight_mg: 3 }] } }, deposition_process: null },
    );
    expect(entry(weightResult, "layer.solution.solids.0.weight_mg").group).toBe("solution");
  });

  it("handles a deposition process appearing on one side", () => {
    const result = diffPresetSnapshots(
      { layer: baseLayer, deposition_process: null },
      { layer: baseLayer, deposition_process: baseProcess },
    );
    expect(entry(result, "deposition_process.method").kind).toBe("added");
    expect(entry(result, "deposition_process.vcd_stages.0.valve").kind).toBe("added");
    expect(entry(result, "deposition_process.vcd_stages.0.valve").group).toBe("depositionProcess");
  });
});

describe("formatDiffValue", () => {
  it("formats numbers with the unit implied by the path", () => {
    expect(formatDiffValue(3000, "layer.process.spin_steps.0.rpm")).toBe("3000 rpm");
    expect(formatDiffValue(600, "layer.process.anneal_steps.0.seconds")).toBe("600 s");
    expect(formatDiffValue(100, "layer.process.anneal_steps.0.temperature_c")).toBe("100 °C");
    expect(formatDiffValue(1, "layer.solution.solids.0.weight_mg")).toBe("1 mg");
    expect(formatDiffValue(900, "deposition_process.vcd_stages.0.pressure_pa")).toBe("900 Pa");
    expect(formatDiffValue(1, "deposition_process.vcd_step_sequence.0")).toBe("1");
  });

  it("distinguishes null, empty text, and zero", () => {
    expect(formatDiffValue(null, "layer.process.thickness_nm")).toBe("Not recorded");
    expect(formatDiffValue("", "layer.process.gas1")).toBe("(empty text)");
    expect(formatDiffValue(0, "layer.process.thickness_nm")).toBe("0 nm");
  });
});
