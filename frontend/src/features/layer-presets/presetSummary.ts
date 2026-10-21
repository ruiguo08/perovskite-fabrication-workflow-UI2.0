import { titleCase } from "../../lib/format";
import { enumLabel, localizeAppText, translate } from "../../i18n";
import type { DeviceLayer, LayerPreset, LayerProcess } from "../../types/api";
import { LAYER_TYPE_DEFS } from "../experiment-builder/state";
import type { DraftIssue } from "../experiment-builder/types";
import {
  completeDepositionProcess,
  completeLayer,
} from "../experiment-builder/validation";

/**
 * Readable summaries and completeness derivation for layer presets.
 *
 * Completeness is derived from the existing validation functions only —
 * `completeDepositionProcess` (the same gate the backend applies when saving
 * a perovskite preset) and `completeLayer` (what copying the template into an
 * experiment requires). No new persisted state is introduced: a partial
 * non-perovskite template stays a legal preset, it simply is not
 * experiment-ready yet, and old presets are never forced to become complete
 * recipes.
 */

/** The fields of a preset the summary and completeness logic read. */
export type PresetSummaryInput = Pick<
  LayerPreset,
  "layer" | "deposition_process" | "scope" | "current_revision_number" | "status"
>;

export interface PresetFact {
  label: string;
  value: string;
}

export interface PresetCompleteness {
  /**
   * Whether the preset passes the save-time template gates. A perovskite
   * preset must carry a complete deposition-process snapshot; every other
   * layer type may legally store a partial template.
   */
  templateComplete: boolean;
  /** Whether the preset's values already form a complete experiment layer. */
  experimentReady: boolean;
  /** Issues that would block saving this content as a preset revision. */
  templateIssues: DraftIssue[];
  /** Gaps between this template and a complete experiment layer. */
  readinessIssues: DraftIssue[];
}

export function layerTypeLabel(layerType: string): string {
  return LAYER_TYPE_DEFS.find((definition) => definition.layerType === layerType)?.label
    ?? titleCase(layerType);
}

const ROLE_ABBREVIATIONS: Record<string, string> = {
  htl: "HTL",
  etl: "ETL",
};

/** Display form of a functional role: known abbreviations are uppercased
 * (HTL/ETL), everything else reads as normal words. */
export function roleLabel(role: string): string {
  return ROLE_ABBREVIATIONS[role] ?? enumLabel(titleCase(role));
}

/**
 * One-line deposition summary for browse cards, per layer type. Non-perovskite
 * presets show their own process values — perovskite-only fields never appear
 * on their cards.
 */
export function processSummary(preset: PresetSummaryInput): string {
  const layer = preset.layer;
  if (layer.layer_type === "perovskite") {
    const process = preset.deposition_process;
    if (!process) {
      return "No deposition process recorded";
    }
    const parts = [
      translate("summary.spinStages", { n: process.spin_steps.length, s: process.spin_steps.length === 1 ? "" : "s" }),
      translate("summary.evacuationStages", { n: process.vcd_stages.length, s: process.vcd_stages.length === 1 ? "" : "s" }),
    ];
    if (process.gas_backfill_stages.length > 0) {
      parts.push(translate("summary.backfillStages", { n: process.gas_backfill_stages.length, s: process.gas_backfill_stages.length === 1 ? "" : "s" }));
    }
    parts.push(translate("summary.annealStages", { n: process.anneal_steps.length, s: process.anneal_steps.length === 1 ? "" : "s" }));
    return parts.join(" · ");
  }
  const process = layer.process;
  if (!process) {
    return "No process recorded";
  }
  if (process.method === "spin_coating") {
    const spins = process.spin_steps?.length ?? 0;
    const anneals = process.anneal_steps?.length ?? 0;
    return `${translate("summary.spinStages", { n: spins, s: spins === 1 ? "" : "s" })} · ${translate("summary.annealStages", { n: anneals, s: anneals === 1 ? "" : "s" })}`;
  }
  if (process.method === "sputtering") {
    return `Sputtering · ${(process.sputter_mode ?? "").toUpperCase() || "RF"} · ${numberValue(process.power_w)} W`;
  }
  if (process.method === "thermal_evaporation") {
    return `Evaporation · ${numberValue(process.thickness_nm)} nm`;
  }
  if (process.method === "ald") {
    return `ALD · ${numberValue(process.cycles)} cycles`;
  }
  return layerMethodLabel(process.method);
}

/**
 * Complete, readable formulation listing for the detail view: every solid
 * with its weight in mg and every solvent with its volume in mL — for both
 * weighed-solids and diluted-dispersion records — plus the stock dispersion
 * name and volume when present. Only recorded values are shown; missing
 * values read "Not recorded" and nothing is derived or defaulted.
 */
export function formulationFacts(layer: PresetSummaryInput["layer"]): PresetFact[] {
  const solution = layer.solution;
  if (!solution) {
    return [{ label: "Formulation", value: "Not recorded" }];
  }
  const facts: PresetFact[] = [];
  if (solution.formulation_type === "diluted_dispersion") {
    facts.push({ label: "Formulation", value: "Diluted dispersion" });
    facts.push({ label: "Stock dispersion", value: solution.stock_dispersion.trim() || "Not recorded" });
    facts.push({
      label: "Stock volume",
      value: solution.stock_volume_ml === null || solution.stock_volume_ml === undefined
        ? "Not recorded"
        : `${solution.stock_volume_ml} mL`,
    });
  } else {
    facts.push({ label: "Formulation", value: "Weighed solids" });
  }
  solution.solids.forEach((solid, index) => {
    facts.push({
      label: `Solid ${index + 1}`,
      value: `${solid.chemical.trim() || "Unnamed"} — ${solid.weight_mg === null || solid.weight_mg === undefined ? "Not recorded" : `${solid.weight_mg} mg`}`,
    });
  });
  if (solution.solids.length === 0) {
    facts.push({ label: "Solids", value: "None recorded" });
  }
  solution.solvents.forEach((solvent, index) => {
    facts.push({
      label: `Solvent ${index + 1}`,
      value: `${solvent.solvent.trim() || "Unnamed"} — ${solvent.volume_ml === null || solvent.volume_ml === undefined ? "Not recorded" : `${solvent.volume_ml} mL`}`,
    });
  });
  if (solution.solvents.length === 0) {
    facts.push({ label: "Solvents", value: "None recorded" });
  }
  return facts;
}

/**
 * The first plain-language gap of an incomplete template, for the one-card
 * warning line ("Partial template — missing: Layer process"). Returns null
 * for experiment-ready presets.
 */
export function firstGapSummary(preset: PresetSummaryInput, vcdValves: readonly string[]): string | null {
  const completeness = presetCompleteness(preset, vcdValves);
  if (completeness.experimentReady) {
    return null;
  }
  const groups = describePresetGaps(completeness.readinessIssues);
  const sections = groups.map((group) => group.section);
  return sections.length > 0 ? sections.join(", ") : "incomplete values";
}

const LAYER_METHOD_LABELS: Record<string, string> = {
  spin_coating: "Spin coating",
  sputtering: "Sputtering",
  thermal_evaporation: "Thermal evaporation",
  ald: "Atomic layer deposition",
};

export function layerMethodLabel(method: string): string {
  return localizeAppText(LAYER_METHOD_LABELS[method] ?? titleCase(method));
}

function numberValue(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? "—" : String(value);
}

function spinSummary(steps: { rpm: number | null; seconds: number | null }[]): string {
  if (steps.length === 0 || steps.some((step) => step.rpm === null || step.seconds === null)) {
    return "Not recorded";
  }
  return steps.map((step) => `${numberValue(step.rpm)} rpm × ${numberValue(step.seconds)} s`).join("; ");
}

function annealSummary(steps: { temperature_c: number | null; seconds: number | null }[]): string {
  if (steps.length === 0) {
    return "None recorded";
  }
  if (steps.some((step) => step.temperature_c === null || step.seconds === null)) {
    return "Not recorded";
  }
  return steps.map((step) => `${numberValue(step.temperature_c)} °C × ${numberValue(step.seconds)} s`).join("; ");
}

function solutionFacts(layer: DeviceLayer): PresetFact[] {
  const solution = layer.solution;
  if (!solution) {
    return [{ label: "Formulation", value: "Not recorded" }];
  }
  const facts: PresetFact[] = [];
  if (solution.formulation_type === "diluted_dispersion") {
    facts.push({ label: "Formulation", value: "Diluted dispersion" });
    facts.push({
      label: "Stock dispersion",
      value: solution.stock_dispersion.trim()
        ? `${solution.stock_dispersion.trim()} · ${numberValue(solution.stock_volume_ml)} mL`
        : "Not recorded",
    });
  } else {
    facts.push({ label: "Formulation", value: "Weighed solids" });
  }
  const solids = solution.solids;
  facts.push({
    label: "Solids",
    value: solids.length === 0
      ? "None recorded"
      : `${solids.length} — ${solids.map((solid) => solid.chemical.trim() || "unnamed").join(", ")}`,
  });
  const solvents = solution.solvents;
  facts.push({
    label: "Solvents",
    value: solvents.length === 0
      ? "None recorded"
      : `${solvents.length} — ${solvents.map((solvent) => solvent.solvent.trim() || "unnamed").join(", ")}`,
  });
  return facts;
}

function layerProcessFacts(process: LayerProcess): PresetFact[] {
  if (process.method === "spin_coating") {
    return [
      { label: "Spin stages", value: spinSummary(process.spin_steps ?? []) },
      { label: "Annealing", value: annealSummary(process.anneal_steps ?? []) },
    ];
  }
  if (process.method === "sputtering") {
    const parts = [
      (process.sputter_mode ?? "").toUpperCase() || null,
      process.power_w === null || process.power_w === undefined ? null : `${numberValue(process.power_w)} W`,
      process.pressure_pa === null || process.pressure_pa === undefined ? null : `${numberValue(process.pressure_pa)} Pa`,
      (process.gas1 ?? "").trim() ? `${process.gas1} ${numberValue(process.gas1_flow_sccm)} sccm` : null,
      (process.gas2 ?? "").trim() ? `${process.gas2} ${numberValue(process.gas2_flow_sccm)} sccm` : null,
      process.duration_seconds === null || process.duration_seconds === undefined ? null : `${numberValue(process.duration_seconds)} s`,
    ].filter((part): part is string => part !== null);
    return [{ label: "Process values", value: parts.length > 0 ? parts.join(" · ") : "Not recorded" }];
  }
  if (process.method === "thermal_evaporation") {
    const parts = [
      process.thickness_nm === null || process.thickness_nm === undefined ? null : `${numberValue(process.thickness_nm)} nm`,
      process.rate_angstrom_per_s === null || process.rate_angstrom_per_s === undefined ? null : `${numberValue(process.rate_angstrom_per_s)} Å/s`,
    ].filter((part): part is string => part !== null);
    return [{ label: "Process values", value: parts.length > 0 ? parts.join(" · ") : "Not recorded" }];
  }
  if (process.method === "ald") {
    const parts = [
      process.thickness_nm === null || process.thickness_nm === undefined ? null : `${numberValue(process.thickness_nm)} nm`,
      process.substrate_temperature_c === null || process.substrate_temperature_c === undefined ? null : `${numberValue(process.substrate_temperature_c)} °C`,
      process.cycles === null || process.cycles === undefined ? null : `${numberValue(process.cycles)} cycles`,
    ].filter((part): part is string => part !== null);
    return [{ label: "Process values", value: parts.length > 0 ? parts.join(" · ") : "Not recorded" }];
  }
  return [];
}

function depositionProcessFacts(preset: PresetSummaryInput): PresetFact[] {
  const process = preset.deposition_process;
  if (!process) {
    return [];
  }
  const facts: PresetFact[] = [{ label: "Spin stages", value: spinSummary(process.spin_steps) }];
  const evacuate = process.vcd_stages.length;
  const backfill = process.gas_backfill_stages.length;
  facts.push({
    label: "VCD program",
    value: evacuate === 0
      ? "Not recorded"
      : `${evacuate} evacuation stage${evacuate === 1 ? "" : "s"}${backfill > 0 ? ` · ${backfill} gas-backfill stage${backfill === 1 ? "" : "s"}` : ""}`,
  });
  facts.push({ label: "Annealing", value: annealSummary(process.anneal_steps) });
  return facts;
}

/**
 * Human-readable summary facts for a preset. Every missing value is stated
 * explicitly ("Not recorded") — no default process numbers are invented.
 */
export function presetSummaryFacts(preset: PresetSummaryInput): PresetFact[] {
  const layer = preset.layer;
  const facts: PresetFact[] = [
    { label: "Layer type", value: layerTypeLabel(layer.layer_type) },
    { label: "Role", value: roleLabel(layer.role) },
  ];
  if (layer.layer_type === "perovskite") {
    facts.push({ label: "Method", value: "Spin coating + VCD" });
  } else {
    facts.push({
      label: "Method",
      value: layer.process ? layerMethodLabel(layer.process.method) : "Not recorded",
    });
  }
  facts.push(...solutionFacts(layer));
  if (layer.process && layer.layer_type !== "perovskite") {
    facts.push(...layerProcessFacts(layer.process));
  }
  facts.push(...depositionProcessFacts(preset));
  facts.push({ label: "Revision", value: `r${preset.current_revision_number}` });
  facts.push({ label: "Scope", value: preset.scope });
  return facts;
}

/**
 * Derive template legality and experiment readiness from the existing
 * validation functions. `templateIssues` mirrors what the backend enforces on
 * save (only a perovskite preset carries completeness requirements);
 * `readinessIssues` mirrors what `completeLayer` requires before the template
 * can be copied into a complete experiment.
 */
export function presetCompleteness(
  preset: PresetSummaryInput,
  vcdValves: readonly string[],
): PresetCompleteness {
  const templateIssues: DraftIssue[] = [];
  const readinessIssues: DraftIssue[] = [];
  const isPerovskite = preset.layer.layer_type === "perovskite";
  if (isPerovskite) {
    if (preset.deposition_process) {
      completeDepositionProcess(
        preset.deposition_process,
        templateIssues,
        "deposition_process",
        "perovskite",
        vcdValves,
      );
    } else {
      templateIssues.push({
        path: "deposition_process",
        message: "A perovskite layer preset requires a deposition process.",
      });
    }
    readinessIssues.push(...templateIssues);
    completeLayer(preset.layer, 0, readinessIssues, "layer");
  } else {
    completeLayer(preset.layer, 0, readinessIssues, "layer");
  }
  return {
    templateComplete: templateIssues.length === 0,
    experimentReady: readinessIssues.length === 0,
    templateIssues,
    readinessIssues,
  };
}

export interface PresetGapGroup {
  /** Readable section the missing values belong to. */
  section: string;
  /** Where in the interface the values are completed. */
  where: string;
  issues: DraftIssue[];
}

const GAP_SECTIONS: { prefix: string; section: string; where: string }[] = [
  { prefix: "deposition_process.spin_steps", section: "Perovskite spin stages", where: "the Perovskite deposition process editor, Spin stages" },
  { prefix: "deposition_process.vcd_stages", section: "Perovskite evacuation stages", where: "the Perovskite deposition process editor, Vacuum and gas-backfill program" },
  { prefix: "deposition_process.gas_backfill_stages", section: "Perovskite gas-backfill stages", where: "the Perovskite deposition process editor, Vacuum and gas-backfill program" },
  { prefix: "deposition_process.vcd_step_sequence", section: "Perovskite program order", where: "the order of rows in the Vacuum and gas-backfill program" },
  { prefix: "deposition_process.anneal_steps", section: "Perovskite annealing stages", where: "the Perovskite deposition process editor, Annealing stages" },
  { prefix: "deposition_process", section: "Perovskite deposition process", where: "the Perovskite deposition process editor" },
  { prefix: "layer.solution.solids", section: "Solution solids", where: "the Solution formulation editor, Solid ingredients" },
  { prefix: "layer.solution.solvents", section: "Solution solvents", where: "the Solution formulation editor, Solvents" },
  { prefix: "layer.solution", section: "Solution formulation", where: "the Solution formulation editor" },
  { prefix: "layer.process.spin_steps", section: "Layer spin stages", where: "the Layer process editor, Spin stages" },
  { prefix: "layer.process.anneal_steps", section: "Layer annealing stages", where: "the Layer process editor, Annealing stages" },
  { prefix: "layer.process", section: "Layer process", where: "the Layer process editor" },
  { prefix: "layer.name", section: "Layer name", where: "the Layer name field" },
  { prefix: "layer", section: "Layer values", where: "the layer editors" },
  { prefix: "name", section: "Preset name", where: "the Preset name field" },
];

/**
 * Group validation issues into readable sections with an explicit pointer to
 * where each gap is completed. The JSON path stays available as a secondary
 * hint but is never the only explanation.
 */
export function describePresetGaps(issues: DraftIssue[]): PresetGapGroup[] {
  const groups = new Map<string, PresetGapGroup>();
  for (const issue of issues) {
    // completeLayer emits indexed base paths ("layer.0.solution…"); sections
    // are matched on the index-free shape so one section collects every stage.
    const normalized = issue.path.replace(/\.(\d+)(?=\.|$)/g, "");
    const match = GAP_SECTIONS.find((entry) => normalized.startsWith(entry.prefix))
      ?? { prefix: "", section: "Other values", where: "the preset editors" };
    const key = match.section;
    const existing = groups.get(key);
    if (existing) {
      existing.issues.push(issue);
    } else {
      groups.set(key, { section: match.section, where: match.where, issues: [issue] });
    }
  }
  return [...groups.values()];
}
