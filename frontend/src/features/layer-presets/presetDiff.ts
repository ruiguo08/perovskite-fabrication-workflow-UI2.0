import { titleCase } from "../../lib/format";
import type { DeviceLayer, PerovskiteDepositionProcess } from "../../types/api";

/**
 * Content comparison between two immutable layer-preset revisions.
 *
 * The comparison runs on raw values first (so `0` differs from `null` and
 * `1` differs from `1.0` is still one value) and formats values only for
 * display. Arrays are compared positionally, so spin, VCD, and anneal stage
 * order is preserved: a reorder surfaces as value changes at the swapped
 * positions rather than a silently equal result.
 *
 * Preset revisions store no historical name or change note, so none is
 * reported here; the identity group covers the fields the snapshot actually
 * contains.
 */

export interface PresetSnapshotLike {
  layer: DeviceLayer;
  deposition_process: PerovskiteDepositionProcess | null;
}

export type PresetDiffGroupKey = "identity" | "solution" | "layerProcess" | "depositionProcess";

export type PresetDiffKind = "added" | "removed" | "changed";

export interface PresetDiffEntry {
  /** Stable machine path, e.g. `layer.solution.solids.0.weight_mg`. */
  path: string;
  /** Readable label derived from the path. */
  label: string;
  group: PresetDiffGroupKey;
  kind: PresetDiffKind;
  left?: unknown;
  right?: unknown;
}

export interface PresetDiffResult {
  entries: PresetDiffEntry[];
  identical: boolean;
}

function isContainer(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function childKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((_, index) => String(index));
  }
  if (isContainer(value)) {
    return Object.keys(value).sort();
  }
  return [];
}

function groupForPath(path: string): PresetDiffGroupKey {
  if (path === "layer.name" || path === "layer.layer_type" || path === "layer.role" || path === "layer.preset_id") {
    return "identity";
  }
  if (path.startsWith("layer.solution")) {
    return "solution";
  }
  if (path.startsWith("layer.process")) {
    return "layerProcess";
  }
  return "depositionProcess";
}

function walk(prefix: string, left: unknown, right: unknown, out: PresetDiffEntry[]): void {
  const leftContainer = isContainer(left);
  const rightContainer = isContainer(right);
  if (leftContainer || rightContainer) {
    // A missing or null side is expanded against the present side so a newly
    // added (or deleted) solution/process shows field-level differences.
    const leftKeys = leftContainer ? childKeys(left) : [];
    const rightKeys = rightContainer ? childKeys(right) : [];
    const keys = [...new Set([...leftKeys, ...rightKeys])];
    const leftValue = leftContainer ? left : undefined;
    const rightValue = rightContainer ? right : undefined;
    for (const key of keys) {
      const childPath = `${prefix}.${key}`;
      const inLeft = leftContainer && key in (left as Record<string, unknown>);
      const inRight = rightContainer && key in (right as Record<string, unknown>);
      const childLeft = inLeft ? (leftValue as Record<string, unknown>)[key] : undefined;
      const childRight = inRight ? (rightValue as Record<string, unknown>)[key] : undefined;
      if (!inLeft && !inRight) {
        continue;
      }
      if (isContainer(childLeft) || isContainer(childRight)) {
        walk(childPath, childLeft, childRight, out);
        continue;
      }
      if (!inLeft) {
        out.push({ path: childPath, label: diffLabel(childPath), group: groupForPath(childPath), kind: "added", right: childRight });
      } else if (!inRight) {
        out.push({ path: childPath, label: diffLabel(childPath), group: groupForPath(childPath), kind: "removed", left: childLeft });
      } else if (!Object.is(childLeft, childRight)) {
        out.push({ path: childPath, label: diffLabel(childPath), group: groupForPath(childPath), kind: "changed", left: childLeft, right: childRight });
      }
    }
    return;
  }
  if (!Object.is(left, right)) {
    out.push({ path: prefix, label: diffLabel(prefix), group: groupForPath(prefix), kind: "changed", left, right });
  }
}

/**
 * Compare two preset snapshots and return their content differences grouped
 * by presentation section. An empty entry list means the two revisions carry
 * identical content.
 */
export function diffPresetSnapshots(left: PresetSnapshotLike, right: PresetSnapshotLike): PresetDiffResult {
  const entries: PresetDiffEntry[] = [];
  walk("layer", left.layer, right.layer, entries);
  walk("deposition_process", left.deposition_process ?? null, right.deposition_process ?? null, entries);
  return { entries, identical: entries.length === 0 };
}

const UNIT_BY_SUFFIX: Record<string, string> = {
  weight_mg: "mg",
  stock_volume_ml: "mL",
  volume_ml: "mL",
  seconds: "s",
  hold_seconds: "s",
  duration_seconds: "s",
  pressure_pa: "Pa",
  target_pressure_pa: "Pa",
  flow_sccm: "sccm",
  gas1_flow_sccm: "sccm",
  gas2_flow_sccm: "sccm",
  temperature_c: "°C",
  substrate_temperature_c: "°C",
  thickness_nm: "nm",
  rate_angstrom_per_s: "Å/s",
  rpm: "rpm",
  acceleration_rpm_per_s: "rpm/s",
  power_w: "W",
};

const LABEL_BY_PATH: { pattern: RegExp; label: (match: RegExpMatchArray) => string }[] = [
  { pattern: /^layer\.name$/, label: () => "Layer name" },
  { pattern: /^layer\.layer_type$/, label: () => "Layer type" },
  { pattern: /^layer\.role$/, label: () => "Role" },
  { pattern: /^layer\.preset_id$/, label: () => "Source key" },
  { pattern: /^layer\.solution\.formulation_type$/, label: () => "Formulation type" },
  { pattern: /^layer\.solution\.stock_dispersion$/, label: () => "Stock dispersion" },
  { pattern: /^layer\.solution\.stock_volume_ml$/, label: () => "Stock volume" },
  { pattern: /^layer\.solution\.solids\.(\d+)\.chemical$/, label: (m) => `Solid ${Number(m[1]) + 1} · Chemical` },
  { pattern: /^layer\.solution\.solids\.(\d+)\.weight_mg$/, label: (m) => `Solid ${Number(m[1]) + 1} · Weight` },
  { pattern: /^layer\.solution\.solvents\.(\d+)\.solvent$/, label: (m) => `Solvent ${Number(m[1]) + 1} · Name` },
  { pattern: /^layer\.solution\.solvents\.(\d+)\.volume_ml$/, label: (m) => `Solvent ${Number(m[1]) + 1} · Volume` },
  { pattern: /^layer\.process\.method$/, label: () => "Process method" },
  { pattern: /^layer\.process\.spin_steps\.(\d+)\.rpm$/, label: (m) => `Spin stage ${Number(m[1]) + 1} · Speed` },
  { pattern: /^layer\.process\.spin_steps\.(\d+)\.seconds$/, label: (m) => `Spin stage ${Number(m[1]) + 1} · Duration` },
  { pattern: /^layer\.process\.spin_steps\.(\d+)\.acceleration_rpm_per_s$/, label: (m) => `Spin stage ${Number(m[1]) + 1} · Acceleration` },
  { pattern: /^layer\.process\.anneal_steps\.(\d+)\.temperature_c$/, label: (m) => `Annealing stage ${Number(m[1]) + 1} · Temperature` },
  { pattern: /^layer\.process\.anneal_steps\.(\d+)\.seconds$/, label: (m) => `Annealing stage ${Number(m[1]) + 1} · Duration` },
  { pattern: /^layer\.process\.sputter_mode$/, label: () => "Sputter mode" },
  { pattern: /^layer\.process\.power_w$/, label: () => "Power" },
  { pattern: /^layer\.process\.pressure_pa$/, label: () => "Pressure" },
  { pattern: /^layer\.process\.gas1$/, label: () => "Gas 1" },
  { pattern: /^layer\.process\.gas1_flow_sccm$/, label: () => "Gas 1 flow" },
  { pattern: /^layer\.process\.gas2$/, label: () => "Gas 2" },
  { pattern: /^layer\.process\.gas2_flow_sccm$/, label: () => "Gas 2 flow" },
  { pattern: /^layer\.process\.duration_seconds$/, label: () => "Duration" },
  { pattern: /^layer\.process\.thickness_nm$/, label: () => "Thickness" },
  { pattern: /^layer\.process\.rate_angstrom_per_s$/, label: () => "Rate" },
  { pattern: /^layer\.process\.substrate_temperature_c$/, label: () => "Substrate temperature" },
  { pattern: /^layer\.process\.cycles$/, label: () => "Cycles" },
  { pattern: /^deposition_process\.method$/, label: () => "Deposition method" },
  { pattern: /^deposition_process\.spin_steps\.(\d+)\.rpm$/, label: (m) => `Deposition · Spin stage ${Number(m[1]) + 1} · Speed` },
  { pattern: /^deposition_process\.spin_steps\.(\d+)\.seconds$/, label: (m) => `Deposition · Spin stage ${Number(m[1]) + 1} · Duration` },
  { pattern: /^deposition_process\.spin_steps\.(\d+)\.acceleration_rpm_per_s$/, label: (m) => `Deposition · Spin stage ${Number(m[1]) + 1} · Acceleration` },
  { pattern: /^deposition_process\.vcd_stages\.(\d+)\.valve$/, label: (m) => `Evacuation stage ${Number(m[1]) + 1} · Valve` },
  { pattern: /^deposition_process\.vcd_stages\.(\d+)\.pressure_pa$/, label: (m) => `Evacuation stage ${Number(m[1]) + 1} · Pressure` },
  { pattern: /^deposition_process\.vcd_stages\.(\d+)\.seconds$/, label: (m) => `Evacuation stage ${Number(m[1]) + 1} · Duration` },
  { pattern: /^deposition_process\.gas_backfill_stages\.(\d+)\.gas$/, label: (m) => `Gas-backfill stage ${Number(m[1]) + 1} · Gas` },
  { pattern: /^deposition_process\.gas_backfill_stages\.(\d+)\.flow_sccm$/, label: (m) => `Gas-backfill stage ${Number(m[1]) + 1} · Flow` },
  { pattern: /^deposition_process\.gas_backfill_stages\.(\d+)\.target_pressure_pa$/, label: (m) => `Gas-backfill stage ${Number(m[1]) + 1} · Target pressure` },
  { pattern: /^deposition_process\.gas_backfill_stages\.(\d+)\.hold_seconds$/, label: (m) => `Gas-backfill stage ${Number(m[1]) + 1} · Hold time` },
  { pattern: /^deposition_process\.vcd_step_sequence\.(\d+)$/, label: (m) => `Program order · Step ${Number(m[1]) + 1}` },
  { pattern: /^deposition_process\.anneal_steps\.(\d+)\.temperature_c$/, label: (m) => `Deposition · Annealing stage ${Number(m[1]) + 1} · Temperature` },
  { pattern: /^deposition_process\.anneal_steps\.(\d+)\.seconds$/, label: (m) => `Deposition · Annealing stage ${Number(m[1]) + 1} · Duration` },
];

function diffLabel(path: string): string {
  for (const entry of LABEL_BY_PATH) {
    const match = path.match(entry.pattern);
    if (match) {
      return entry.label(match);
    }
  }
  return titleCase(path.split(".").pop() ?? path);
}

/** Format a raw diff value for display; raw values are compared before this. */
export function formatDiffValue(value: unknown, path: string): string {
  if (value === undefined) {
    return "—";
  }
  if (value === null) {
    return "Not recorded";
  }
  if (typeof value === "string") {
    return value.trim() === "" ? "(empty text)" : value;
  }
  if (typeof value === "number") {
    const suffix = (path.match(/[a-z0-9_]+$/) ?? [""])[0];
    const unit = UNIT_BY_SUFFIX[suffix];
    return unit ? `${value} ${unit}` : String(value);
  }
  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }
  return JSON.stringify(value);
}
