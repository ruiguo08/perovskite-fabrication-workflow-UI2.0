import { describe, expect, it } from "vitest";
import { buildConditionMatrix } from "./conditionMatrix";
import { condition, detail } from "../test/analysisFixtures";
import { setLanguage } from "../i18n";

describe("buildConditionMatrix", () => {
  it("localizes display labels and schema enums while preserving row identities and raw differences", () => {
    const source = detail(1);
    source.conditions[0].recipe_snapshot.device.architecture = "nip";
    const english = buildConditionMatrix([source]);
    const before = JSON.stringify(source);
    setLanguage("zh");
    const chinese = buildConditionMatrix([source]);
    expect(chinese.rows.map(({ parameter, differs }) => ({ parameter, differs })))
      .toEqual(english.rows.map(({ parameter, differs }) => ({ parameter, differs })));
    expect(chinese.rows.find((row) => row.parameter === "Deposition › Spin step 1 › Speed"))
      .toMatchObject({ label: "沉积 › 旋涂步骤 1 › 转速", values: ["1000 rpm", "2000 rpm"] });
    expect(chinese.rows.find((row) => row.parameter === "Device › Architecture")?.values[0]).toBe("正式结构");
    expect(JSON.stringify(source)).toBe(before);
  });

  it("compares every control and target with stable experiment and condition identities", () => {
    const first = detail(1, "Same displayed code");
    const second = detail(2, "Same displayed code");
    second.conditions[1].recipe_snapshot.deposition_process.spin_steps[0].rpm = 3000;
    const matrix = buildConditionMatrix([first, second, first]);
    expect(matrix.columns.map((column) => column.key)).toEqual(["1:10", "1:11", "2:20", "2:21"]);
    expect(matrix.columns.map((column) => column.condition)).toEqual(["C10 · Control", "C11 · Target", "C20 · Control", "C21 · Target"]);
    const spin = matrix.rows.find((row) => row.parameter === "Deposition › Spin step 1 › Speed");
    expect(spin?.values).toEqual(["1000 rpm", "2000 rpm", "1000 rpm", "3000 rpm"]);
    expect(spin?.differs).toBe(true);
  });

  it("includes formulations, substrate dimensions, layout geometry, VCD, gas and annealing parameters", () => {
    const first = detail(1);
    const second = detail(2);
    second.conditions[0].recipe_snapshot.device.layers[0].solution!.solids[0].weight_mg = 0;
    second.conditions[0].recipe_snapshot.device.substrate.width_mm = 20;
    second.conditions[0].device_layout_snapshot.device_active_area_cm2 = "0.2";
    second.conditions[0].recipe_snapshot.deposition_process.vcd_stages[0].pressure_pa = 0;
    second.conditions[0].recipe_snapshot.deposition_process.gas_backfill_stages[0].flow_sccm = 0;
    second.conditions[0].recipe_snapshot.deposition_process.anneal_steps[0].temperature_c = 110;
    const rows = buildConditionMatrix([first, second]).rows;
    for (const parameter of ["Device › Layer 1 › Solution › Solid 1 › Weight", "Device › Substrate › Width", "Layout › Device active area",
      "Deposition › VCD stage 1 › Pressure", "Deposition › Gas backfill 1 › Flow", "Deposition › Anneal step 1 › Temperature"]) {
      expect(rows.find((row) => row.parameter === parameter)?.differs, parameter).toBe(true);
    }
    expect(rows.find((row) => row.parameter.endsWith("Solid 1 › Weight"))?.values).toContain("0 mg");
    expect(rows.find((row) => row.parameter === "Layout › Device active area")?.values[0]).toBe("0.1 cm²");
  });

  it("compares every layer process scalar and preserves zero values and missing-layer differences", () => {
    const first = detail(1);
    first.conditions = [condition(10)];
    first.conditions[0].recipe_snapshot.device.layers.push({ name: "Contact", role: "contact", layer_type: "electrode", preset_id: null, solution: null,
      process: { method: "sputtering", sputter_mode: "rf", power_w: 0, pressure_pa: 0, gas1: "Ar", gas1_flow_sccm: 0,
        gas2: "N2", gas2_flow_sccm: 0, duration_seconds: 0, thickness_nm: 0, rate_angstrom_per_s: 0, substrate_temperature_c: 0, cycles: 0,
        spin_steps: [{ rpm: 0, seconds: 0, acceleration_rpm_per_s: 0 }], anneal_steps: [{ temperature_c: 0, seconds: 0 }] } });
    const second = detail(2);
    second.conditions = [condition(20)];
    const matrix = buildConditionMatrix([first, second]);
    const process = matrix.rows.filter((row) => row.parameter.startsWith("Device › Layer 2 › Process"));
    expect(process.map((row) => row.values[0])).toEqual(expect.arrayContaining(["sputtering", "rf", "0 W", "0 Pa", "Ar", "0 sccm", "N2", "0 s", "0 nm", "0 Å/s", "0 °C", "0", "0 rpm", "0 rpm/s"]));
    expect(process.every((row) => row.values[1] === null && row.differs)).toBe(true);
  });

  it("distinguishes an omitted value from zero and ignores internal metadata", () => {
    const first = detail(1);
    first.conditions = [condition(10, 0)];
    const second = detail(2);
    second.conditions = [condition(20, 0)];
    second.conditions[0].recipe_snapshot.deposition_process.spin_steps[0].rpm = null;
    second.conditions[0].device_layout_snapshot.version = 99;
    second.conditions[0].canonical_hash = "another-private-hash";
    const matrix = buildConditionMatrix([first, second]);
    expect(matrix.rows.find((row) => row.parameter === "Deposition › Spin step 1 › Speed")).toMatchObject({ values: ["0 rpm", null], differs: true });
    const serialized = JSON.stringify(matrix.rows);
    expect(serialized).not.toMatch(/schema|version|hash|private-preset|preset id/i);
  });

  it("includes wire snapshot architecture, dispersion formulations and readable physical step order", () => {
    const first = detail(1);
    first.conditions[0].recipe_snapshot.device.architecture = "nip";
    first.conditions[0].recipe_snapshot.device.layers[0].solution = {
      formulation_type: "diluted_dispersion", stock_dispersion: "PEDOT:PSS", stock_volume_ml: 0.2, solids: [], solvents: [{ solvent: "DMF", volume_ml: 0.2 }],
    };
    first.conditions[1] = structuredClone(first.conditions[0]);
    Object.assign(first.conditions[1], { id: 11, condition_code: "C11", condition_name: "Target", role: "target" });
    first.conditions[1].recipe_snapshot.device.layers[0].solution!.solvents[0] = { solvent: "DMSO", volume_ml: 0.4 };
    const matrix = buildConditionMatrix([first]);
    expect(matrix.rows.find((row) => row.parameter === "Device › Architecture")?.values[0]).toBe("nip");
    expect(matrix.rows.find((row) => row.parameter.endsWith("Solution › Stock volume"))?.values[0]).toBe("0.2 mL");
    expect(matrix.rows.find((row) => row.parameter === "Deposition › VCD sequence")?.values[0]).toBe("VCD stage 1 → Gas backfill 1");
    expect(matrix.rows.find((row) => row.parameter.endsWith("Solution › Solvent 1 › Solvent"))).toMatchObject({ values: ["DMF", "DMSO"], differs: true });
    expect(matrix.rows.find((row) => row.parameter.endsWith("Solution › Solvent 1 › Volume"))).toMatchObject({ values: ["0.2 mL", "0.4 mL"], differs: true });
  });

  it("retains extra VCD and gas stages, target pressures, zero holds and physical step order", () => {
    const first = detail(1);
    first.conditions = [first.conditions[0]];
    const second = detail(2);
    second.conditions = [second.conditions[0]];
    const process = second.conditions[0].recipe_snapshot.deposition_process;
    process.vcd_stages[0].seconds = 0;
    process.vcd_stages.push({ valve: "VV06", pressure_pa: 100, seconds: 30 });
    process.gas_backfill_stages[0].target_pressure_pa = 0;
    process.gas_backfill_stages[0].hold_seconds = 0;
    process.gas_backfill_stages.push({ gas: "N2", flow_sccm: 15, target_pressure_pa: 200000, hold_seconds: 10 });
    process.vcd_step_sequence = ["vcd_stage1", "gas_backfill_stage1", "vcd_stage2", "gas_backfill_stage2"];
    const rows = buildConditionMatrix([first, second]).rows;
    expect(rows.find((row) => row.parameter === "Deposition › VCD stage 1 › Duration")).toMatchObject({ values: ["60 s", "0 s"], differs: true });
    expect(rows.find((row) => row.parameter === "Deposition › VCD stage 2 › Valve")).toMatchObject({ values: [null, "VV06"], differs: true });
    expect(rows.find((row) => row.parameter === "Deposition › Gas backfill 1 › Target pressure")).toMatchObject({ values: ["100000 Pa", "0 Pa"], differs: true });
    expect(rows.find((row) => row.parameter === "Deposition › Gas backfill 1 › Hold duration")).toMatchObject({ values: ["5 s", "0 s"], differs: true });
    expect(rows.find((row) => row.parameter === "Deposition › Gas backfill 2 › Flow")?.values).toEqual([null, "15 sccm"]);
    expect(rows.find((row) => row.parameter === "Deposition › VCD sequence")?.values[1]).toBe("VCD stage 1 → Gas backfill 1 → VCD stage 2 → Gas backfill 2");
  });
});
