import { describe, expect, it } from "vitest";
import type { DeviceLayer, LayerPreset, PerovskiteDepositionProcess } from "../../types/api";
import {
  describePresetGaps,
  presetCompleteness,
  presetSummaryFacts,
} from "./presetSummary";

const samLayer: DeviceLayer = {
  layer_type: "sam",
  role: "htl",
  name: "2PACz",
  preset_id: null,
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

const completePerovskiteProcess: PerovskiteDepositionProcess = {
  method: "spin_coating_vcd",
  spin_steps: [{ rpm: 1000, seconds: 10, acceleration_rpm_per_s: 100 }],
  vcd_stages: [{ valve: "VV02", pressure_pa: 900, seconds: 10 }],
  gas_backfill_stages: [],
  vcd_step_sequence: ["vcd_stage1"],
  anneal_steps: [{ temperature_c: 100, seconds: 60 }],
};

function presetFixture(overrides: Partial<LayerPreset> = {}): LayerPreset {
  return {
    id: 1,
    preset_key: "test-preset",
    name: "Test preset",
    status: "active",
    scope: "personal",
    layer: samLayer,
    deposition_process: null,
    current_revision_number: 3,
    current_version_id: 11,
    canonical_hash: "a".repeat(64),
    created_at: "2026-08-01T08:00:00Z",
    updated_at: "2026-08-01T08:00:00Z",
    ...overrides,
  };
}

describe("presetSummaryFacts", () => {
  it("reports counts, method, and process values without inventing numbers", () => {
    const facts = presetSummaryFacts(presetFixture());
    const byLabel = Object.fromEntries(facts.map((fact) => [fact.label, fact.value]));
    expect(byLabel["Layer type"]).toBe("SAM");
    expect(byLabel["Role"]).toBe("HTL");
    expect(byLabel["Method"]).toBe("Spin coating");
    expect(byLabel["Formulation"]).toBe("Weighed solids");
    expect(byLabel["Solids"]).toContain("1 — 2PACz");
    expect(byLabel["Solvents"]).toContain("1 — ethanol");
    expect(byLabel["Spin stages"]).toBe("3000 rpm × 30 s");
    expect(byLabel["Annealing"]).toBe("100 °C × 600 s");
    expect(byLabel["Revision"]).toBe("r3");
    expect(byLabel["Scope"]).toBe("personal");
  });

  it("marks missing values explicitly instead of defaulting them", () => {
    const facts = presetSummaryFacts(presetFixture({
      layer: { ...samLayer, solution: null, process: null },
    }));
    const byLabel = Object.fromEntries(facts.map((fact) => [fact.label, fact.value]));
    expect(byLabel["Method"]).toBe("Not recorded");
    expect(byLabel["Formulation"]).toBe("Not recorded");
    expect(Object.keys(byLabel)).not.toContain("Solids");
    expect(Object.keys(byLabel)).not.toContain("Spin stages");
  });

  it("summarizes a perovskite deposition program with stage counts", () => {
    const facts = presetSummaryFacts(presetFixture({
      layer: { ...samLayer, layer_type: "perovskite", role: "perovskite", process: null },
      deposition_process: {
        ...completePerovskiteProcess,
        gas_backfill_stages: [{ gas: "N2", flow_sccm: 20, target_pressure_pa: 500, hold_seconds: 5 }],
        vcd_step_sequence: ["vcd_stage1", "gas_backfill_stage1"],
      },
    }));
    const byLabel = Object.fromEntries(facts.map((fact) => [fact.label, fact.value]));
    expect(byLabel["Method"]).toBe("Spin coating + VCD");
    expect(byLabel["VCD program"]).toBe("1 evacuation stage · 1 gas-backfill stage");
    expect(byLabel["Annealing"]).toBe("100 °C × 60 s");
  });
});

describe("presetCompleteness", () => {
  it("treats a complete non-perovskite template as experiment-ready", () => {
    const completeness = presetCompleteness(presetFixture(), ["VV02"]);
    expect(completeness.templateComplete).toBe(true);
    expect(completeness.experimentReady).toBe(true);
    expect(completeness.readinessIssues).toEqual([]);
  });

  it("keeps a partial non-perovskite template legal but not experiment-ready", () => {
    const completeness = presetCompleteness(
      presetFixture({ layer: { ...samLayer, solution: null, process: null } }),
      ["VV02"],
    );
    expect(completeness.templateComplete).toBe(true);
    expect(completeness.experimentReady).toBe(false);
    const messages = completeness.readinessIssues.map((issue) => issue.message).join(" ");
    expect(messages).toContain("requires a layer process");
  });

  it("gates a perovskite preset on the complete deposition snapshot", () => {
    const completeness = presetCompleteness(
      presetFixture({
        layer: { ...samLayer, layer_type: "perovskite", role: "perovskite", process: null },
        deposition_process: { ...completePerovskiteProcess, spin_steps: [] },
      }),
      ["VV02"],
    );
    expect(completeness.templateComplete).toBe(false);
    expect(completeness.experimentReady).toBe(false);
    expect(completeness.templateIssues.some((issue) => issue.path === "deposition_process.spin_steps")).toBe(true);
  });

  it("reports a perovskite preset without any deposition snapshot as incomplete", () => {
    const completeness = presetCompleteness(
      presetFixture({
        layer: { ...samLayer, layer_type: "perovskite", role: "perovskite", process: null },
        deposition_process: null,
      }),
      ["VV02"],
    );
    expect(completeness.templateComplete).toBe(false);
    expect(completeness.templateIssues[0].path).toBe("deposition_process");
  });
});

describe("describePresetGaps", () => {
  it("groups indexed validation paths into readable sections with a where hint", () => {
    const groups = describePresetGaps([
      { path: "layer.0.solution.solids", message: "SAM requires at least one solid ingredient." },
      { path: "layer.0.process.spin_steps", message: "SAM has an incomplete spin step." },
      { path: "deposition_process.vcd_stages", message: "Record one to five VCD evacuation stages." },
    ]);
    const sections = groups.map((group) => group.section);
    expect(sections).toEqual([
      "Solution solids",
      "Layer spin stages",
      "Perovskite evacuation stages",
    ]);
    expect(groups[0].where).toContain("Solid ingredients");
    expect(groups[2].where).toContain("Vacuum and gas-backfill program");
  });
});
