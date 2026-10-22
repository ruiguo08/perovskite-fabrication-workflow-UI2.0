import type { Condition, ExperimentDetail } from "../types/api";
import { enumLabel, localizeAppText } from "../i18n";

export interface ConditionMatrix {
  columns: { key: string; experiment: string; condition: string; role: string }[];
  rows: { parameter: string; label: string; values: (string | null)[]; differs: boolean }[];
}

const LABELS: Record<string, string> = {
  setup_mode: "Setup", junction_type: "Junction", perovskite_bandgap: "Bandgap", tandem_type: "Tandem type",
  type_number: "Product", width_mm: "Width", length_mm: "Length", substrate_width_mm: "Substrate width",
  substrate_length_mm: "Substrate length", layer_type: "Layer type", formulation_type: "Formulation",
  stock_dispersion: "Stock dispersion", stock_volume_ml: "Stock volume", weight_mg: "Weight", volume_ml: "Volume",
  rpm: "Speed", seconds: "Duration", acceleration_rpm_per_s: "Acceleration", temperature_c: "Temperature",
  pressure_pa: "Pressure", flow_sccm: "Flow", target_pressure_pa: "Target pressure", hold_seconds: "Hold duration",
  vcd_step_sequence: "VCD sequence", sputter_mode: "Sputter mode", power_w: "Power", gas1: "Gas 1", gas2: "Gas 2",
  gas1_flow_sccm: "Gas 1 flow", gas2_flow_sccm: "Gas 2 flow", duration_seconds: "Duration",
  thickness_nm: "Thickness", rate_angstrom_per_s: "Rate", substrate_temperature_c: "Substrate temperature",
  devices_per_substrate: "Devices per substrate", device_active_area_cm2: "Device active area",
  total_active_area_cm2: "Total active area", planned_substrate_count: "Planned substrates", expected_device_count: "Expected devices",
};
const UNITS: Record<string, string> = {
  width_mm: "mm", length_mm: "mm", substrate_width_mm: "mm", substrate_length_mm: "mm",
  stock_volume_ml: "mL", volume_ml: "mL", weight_mg: "mg", rpm: "rpm", seconds: "s",
  acceleration_rpm_per_s: "rpm/s", temperature_c: "°C", pressure_pa: "Pa", flow_sccm: "sccm",
  target_pressure_pa: "Pa", hold_seconds: "s", power_w: "W", gas1_flow_sccm: "sccm", gas2_flow_sccm: "sccm",
  duration_seconds: "s", thickness_nm: "nm", rate_angstrom_per_s: "Å/s", substrate_temperature_c: "°C",
  device_active_area_cm2: "cm²", total_active_area_cm2: "cm²",
};
const ARRAY_LABELS: Record<string, string> = {
  layers: "Layer", solids: "Solid", solvents: "Solvent", spin_steps: "Spin step", anneal_steps: "Anneal step",
  vcd_stages: "VCD stage", gas_backfill_stages: "Gas backfill",
};
const ENUM_FIELDS = new Set(["architecture", "setup_mode", "junction_type", "perovskite_bandgap", "tandem_type", "layer_type", "role", "formulation_type", "method", "sputter_mode"]);
const METADATA_FIELDS = new Set(["schema_version", "version", "code", "canonical_hash", "preset_id"]);

function label(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, " ").replace(/^./, (character) => character.toUpperCase());
}

function scientificValues(condition: Condition, localized = false): Map<string, string | null> {
  const values = new Map<string, string | null>();
  function visit(value: unknown, path: string, key: string): void {
    if (METADATA_FIELDS.has(key) || key.endsWith("_id") || key.endsWith("_hash")) return;
    if (Array.isArray(value)) {
      if (key === "vcd_step_sequence") {
        const steps = value.map((step) => String(step).replace(/^vcd_stage(\d+)$/, "VCD stage $1")
          .replace(/^gas_backfill_stage(\d+)$/, "Gas backfill $1").replace(/^spin_step(\d+)$/, "Spin step $1"));
        values.set(path, steps.length ? steps.map((step) => localized ? localizeAppText(step) : step).join(" → ") : null);
      } else {
        const parent = path.slice(0, path.lastIndexOf(" › ") + 3);
        value.forEach((item, index) => visit(item, `${parent}${ARRAY_LABELS[key] ?? label(key)} ${index + 1}`, ""));
      }
    } else if (value !== null && typeof value === "object") {
      for (const [childKey, child] of Object.entries(value)) {
        visit(child, `${path} › ${label(childKey)}`, childKey);
      }
    } else {
      const unit = UNITS[key];
      const present = value !== null && value !== undefined && value !== "";
      let text = present ? String(value) : null;
      if (text !== null && unit && Number.isFinite(Number(value))) text = `${Number(value)} ${unit}`;
      else if (text !== null && ENUM_FIELDS.has(key)) text = localized ? enumLabel(text) : text.replace(/_/g, " ");
      else if (typeof value === "boolean") text = localized ? localizeAppText(value ? "Yes" : "No") : value ? "Yes" : "No";
      values.set(path, text);
    }
  }
  visit(condition.recipe_snapshot.device, "Device", "device");
  visit(condition.recipe_snapshot.deposition_process, "Deposition", "deposition_process");
  visit(condition.device_layout_snapshot, "Layout", "layout");
  visit(condition.planned_substrate_count, "Planned substrates", "planned_substrate_count");
  visit(condition.expected_device_count, "Expected devices", "expected_device_count");
  return values;
}

/** One column per frozen condition, including targets; only physical values
 * participate in differences. Internal row IDs identify React columns, never
 * the displayed parameters. Missing values differ from present values. */
export function buildConditionMatrix(details: ExperimentDetail[]): ConditionMatrix {
  const columns: ConditionMatrix["columns"] = [];
  const snapshots: Map<string, string | null>[] = [];
  const displayedSnapshots: Map<string, string | null>[] = [];
  const seen = new Set<string>();
  for (const detail of details) {
    for (const condition of detail.conditions) {
      const key = `${detail.experiment.id}:${condition.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      columns.push({ key, experiment: detail.experiment.experiment_code ?? "Unnamed experiment",
        condition: `${condition.condition_code} · ${condition.condition_name}`, role: condition.role });
      snapshots.push(scientificValues(condition));
      displayedSnapshots.push(scientificValues(condition, true));
    }
  }
  const parameters = new Set(snapshots.flatMap((snapshot) => [...snapshot.keys()]));
  const rows = [...parameters].map((parameter) => {
    const rawValues = snapshots.map((snapshot) => snapshot.get(parameter) ?? null);
    const values = displayedSnapshots.map((snapshot) => snapshot.get(parameter) ?? null);
    const label = parameter.split(" › ").map(localizeAppText).join(" › ");
    return { parameter, label, values, differs: new Set(rawValues).size > 1 };
  }).filter((row) => row.values.some((value) => value !== null));
  return { columns, rows };
}
