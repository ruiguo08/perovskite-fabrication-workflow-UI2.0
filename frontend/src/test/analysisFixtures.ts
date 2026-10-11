import type { Condition, Experiment, ExperimentDetail, FabricationBatchListItem, ResultListItem } from "../types/api";

export function condition(id: number, rpm = 1000, role = "control"): Condition {
  return {
    id, experiment_id: 1, role, condition_code: `C${id}`, condition_name: role === "target" ? "Target" : "Control",
    recipe_snapshot: {
      schema_version: 3,
      device: {
        schema_version: 2, setup_mode: "baseline", junction_type: "single_junction", perovskite_bandgap: "normal_bandgap", tandem_type: null, architecture: "pin",
        substrate: { material: "ITO", vendor: "Vendor", type_number: "Glass", width_mm: 15, length_mm: 15 },
        layers: [{ name: "Absorber", role: "perovskite", layer_type: "perovskite", preset_id: "private-preset",
          solution: { formulation_type: "weighed_solids", stock_dispersion: "", stock_volume_ml: null,
            solids: [{ chemical: "PbI2", weight_mg: 100 }], solvents: [{ solvent: "DMF", volume_ml: 0.8 }] }, process: null }],
      },
      deposition_process: {
        method: "spin_coating_vcd", spin_steps: [{ rpm, seconds: 10, acceleration_rpm_per_s: 500 }],
        vcd_stages: [{ valve: "VV02", pressure_pa: 100, seconds: 60 }],
        gas_backfill_stages: [{ gas: "N2", flow_sccm: 20, target_pressure_pa: 100000, hold_seconds: 5 }],
        vcd_step_sequence: ["vcd_stage1", "gas_backfill_stage1"], anneal_steps: [{ temperature_c: 100, seconds: 3600 }],
      },
    },
    recipe_schema_version: 3, canonical_hash: "private-hash", source_baseline_version_id: 42,
    device_layout_code: "15x15-6", device_layout_snapshot: { code: "15x15-6", version: 1, substrate_width_mm: "15",
      substrate_length_mm: "15", devices_per_substrate: 6, device_active_area_cm2: "0.10", total_active_area_cm2: "0.6", description: "Six devices" },
    planned_substrate_count: 3, expected_device_count: 18, requires_manual_review: false, created_at: "2026-10-03T08:00:00Z",
  };
}

export function experiment(id: number, code = `Plan-${id}`): Experiment {
  return { id, experiment_code: code, recipe: { device_recipe: null }, status: "suggested", metrics: {}, failure_reason: null,
    created_at: "2026-10-03T08:00:00Z", updated_at: "2026-10-03T08:00:00Z", campaign_id: "review", series_version: 1,
    plan_type: "comparison", plan_status: "completed", device_summary: null, best_pce: 25, best_jsc: 24 };
}

export function detail(id: number, code = `Plan-${id}`): ExperimentDetail {
  return { experiment: experiment(id, code), conditions: [condition(id * 10, 1000), condition(id * 10 + 1, 2000, "target")],
    substrate_exceptions: [], fabrication_batches: [], results: [], approval_scope_digest: `digest-${id}` };
}

export function result(id: number, experimentId: number): ResultListItem {
  return { id, experiment_id: experimentId, experiment_code: `Plan-${experimentId}`, fabrication_batch_id: experimentId * 100,
    batch_code: `B${experimentId}`, filename: `scan-${id}.csv`, content_type: "text/csv", size_bytes: 100, sha256: "private-hash",
    group_assignment: "", metrics: {}, analysis_schema_version: 7, created_at: "2026-10-03T08:00:00Z" };
}

export function batch(id: number, experimentId: number): FabricationBatchListItem {
  return { id, experiment_id: experimentId, experiment_code: `Plan-${experimentId}`, batch_number: 1, batch_code: `B${experimentId}`,
    status: "completed", condition_set_hash: "private-hash", notes: "", created_by_id: 1,
    created_at: "2026-10-03T08:00:00Z", updated_at: "2026-10-03T08:00:00Z", started_at: null, completed_at: null, cancelled_at: null,
    best_pce: 20, best_jsc: 22 };
}
