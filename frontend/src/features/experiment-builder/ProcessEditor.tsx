import { localizeAppText } from "../../i18n";
import { useMemo } from "react";
import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";

import { HelpHint } from "../../components/HelpHint";
import { NumberField, SelectField } from "../../components/Field";
import { VCD_VALVES } from "../../lib/constraints";
import { ALLOWED_LAYER_METHODS, completeDepositionProcess, completeLayerProcess } from "./validation";
import type { DraftIssue } from "./types";
import type {
  AnnealStep,
  GasBackfillStage,
  LayerProcess,
  Material,
  PerovskiteDepositionProcess,
  SpinStep,
  VcdStage,
} from "../../types/api";

/** Marker shown next to a group heading: "required" groups block saving until
 * every stage is filled in; "optional" groups can be left empty. */
function GroupMarker({ required }: { required: boolean }) {
  useUiLanguage();
  return required
    ? <span className="field-marker field-marker--required">{tr("processEditor.required")}</span>
    : <span className="field-marker">{tr("processEditor.optional")}</span>;
}

function updateAt<T>(items: T[], index: number, replacement: T): T[] {
  return items.map((item, itemIndex) => itemIndex === index ? replacement : item);
}

function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function defaultLayerProcess(method: string): LayerProcess {
  if (method === "sputtering") {
    return { method, sputter_mode: "rf", power_w: null, pressure_pa: null, gas1: "", gas1_flow_sccm: null, gas2: "", gas2_flow_sccm: null, duration_seconds: null };
  }
  if (method === "thermal_evaporation") {
    return { method, thickness_nm: null, rate_angstrom_per_s: null };
  }
  if (method === "ald") {
    return { method, thickness_nm: null, substrate_temperature_c: null, cycles: null };
  }
  return { method: "spin_coating", spin_steps: [{ rpm: null, seconds: null, acceleration_rpm_per_s: null }], anneal_steps: [] };
}

interface SpinStagesProps {
  stages: SpinStep[];
  max: number;
  onChange: (stages: SpinStep[]) => void;
}

function SpinStages({ stages, max, onChange }: SpinStagesProps) {
  useUiLanguage();
  return (
    <div className="builder-stage-group">
      <div className="builder-subeditor__heading">
        <h4>{tr("processEditor.spinStages")}<GroupMarker required /></h4>
        <button
          type="button"
          className="button button--secondary button--small"
          disabled={stages.length >= max}
          onClick={() => onChange([...stages, { rpm: null, seconds: null, acceleration_rpm_per_s: null }])}
        >
          {tr("processEditor.addSpinStage")}</button>
      </div>
      {stages.map((stage, index) => (
        <div className="builder-stage-row builder-stage-row--four" key={`spin-${index}`}>
          <NumberField label={tr("processEditor.stageNSpeedRpm", { "n": index + 1 })} value={stage.rpm} onChange={(value) => onChange(updateAt(stages, index, { ...stage, rpm: value }))} step="1" />
          <NumberField label={tr("processEditor.durationS")} value={stage.seconds} onChange={(value) => onChange(updateAt(stages, index, { ...stage, seconds: value }))} step="1" />
          <NumberField label={tr("processEditor.accelerationRpmS")} value={stage.acceleration_rpm_per_s} onChange={(value) => onChange(updateAt(stages, index, { ...stage, acceleration_rpm_per_s: value }))} step="1" />
          <button type="button" className="button button--secondary button--small builder-stage-row__remove" disabled={stages.length <= 1} onClick={() => onChange(removeAt(stages, index))}>
            {tr("snapshotEditor.remove")}</button>
        </div>
      ))}
    </div>
  );
}

interface AnnealStagesProps {
  stages: AnnealStep[];
  onChange: (stages: AnnealStep[]) => void;
  required?: boolean;
}

function AnnealStages({ stages, onChange, required = false }: AnnealStagesProps) {
  useUiLanguage();
  return (
    <div className="builder-stage-group">
      <div className="builder-subeditor__heading">
        <h4>{tr("processEditor.annealingStages")}{required ? <GroupMarker required /> : <GroupMarker required={false} />}</h4>
        <button
          type="button"
          className="button button--secondary button--small"
          disabled={stages.length >= 2}
          onClick={() => onChange([...stages, { temperature_c: null, seconds: null }])}
        >
          {tr("processEditor.addAnnealingStage")}</button>
      </div>
      {stages.map((stage, index) => (
        <div className="builder-stage-row" key={`anneal-${index}`}>
          <NumberField label={tr("processEditor.stageNTemperatureC", { "n": index + 1 })} value={stage.temperature_c} onChange={(value) => onChange(updateAt(stages, index, { ...stage, temperature_c: value }))} step="1" />
          <NumberField label={tr("processEditor.durationS")} value={stage.seconds} onChange={(value) => onChange(updateAt(stages, index, { ...stage, seconds: value }))} step="1" />
          <button type="button" className="button button--secondary button--small builder-stage-row__remove" disabled={required && stages.length <= 1} onClick={() => onChange(removeAt(stages, index))}>
            {tr("snapshotEditor.remove")}</button>
        </div>
      ))}
    </div>
  );
}

interface LayerProcessEditorProps {
  layerType: string;
  process: LayerProcess | null;
  materials: Material[];
  onChange: (process: LayerProcess | null) => void;
}

const METHOD_LABELS: Record<string, string> = {
  spin_coating: "Spin coating",
  sputtering: "Sputtering",
  thermal_evaporation: "Thermal evaporation",
  ald: "Atomic layer deposition",
};

// Pending entries in the materials list are the current user's own proposals
// (scoped by /api/materials), so they are offered alongside active gases.
function gasMaterialNames(materials: Material[]): string[] {
  return materials
    .filter((item) => (item.status === "active" || item.status === "pending") && item.category === "gas")
    .map((item) => item.name);
}

export function LayerProcessEditor({ layerType, process, materials, onChange }: LayerProcessEditorProps) {
  useUiLanguage();
  const gasNames = gasMaterialNames(materials);
  const allowedMethods = ALLOWED_LAYER_METHODS[layerType] ?? [];
  const issues = useMemo(() => {
    if (process === null) return [];
    const found: DraftIssue[] = [];
    completeLayerProcess(process, found, "process", "This layer");
    return found;
  }, [process]);
  if (process === null) {
    return (
      <div className="builder-empty-editor">
        <p>{tr("processEditor.noLayerProcessIsRecorded")}</p>
        <button type="button" className="button button--secondary button--small" disabled={allowedMethods.length === 0} onClick={() => onChange(defaultLayerProcess(allowedMethods[0]))}>{tr("processEditor.addProcess")}</button>
      </div>
    );
  }

  return (
    <div className="builder-subeditor">
      <div className="builder-subeditor__heading">
        <h4>{tr("processEditor.layerProcess")}</h4>
        <button type="button" className="button button--secondary button--small" onClick={() => onChange(null)}>{tr("processEditor.removeProcess")}</button>
      </div>
      {issues.length > 0 ? (
        <div className="builder-inline-warning" role="status">
          <strong>{tr("processEditor.thisLayerProcessIsNotCompleteYet")}</strong>
          <ul>
            {issues.map((issue, index) => <li key={`${issue.path}-${index}`}>{localizeAppText(issue.message ?? "")}</li>)}
          </ul>
          <span>{tr("processEditor.fillInTheMissingValuesBelowTheSaveButton")}</span>
        </div>
      ) : null}
      <label className="builder-field">
        <span>{tr("processEditor.method")}</span>
        <select className="text-input" value={process.method} onChange={(event) => onChange(defaultLayerProcess(event.target.value))}>
          {allowedMethods.map((method) => <option key={method} value={method}>{METHOD_LABELS[method]}</option>)}
        </select>
      </label>

      {process.method === "spin_coating" ? (
        <>
          <SpinStages stages={process.spin_steps ?? []} max={3} onChange={(spin_steps) => onChange({ ...process, spin_steps })} />
          <AnnealStages stages={process.anneal_steps ?? []} onChange={(anneal_steps) => onChange({ ...process, anneal_steps })} />
        </>
      ) : null}

      {process.method === "sputtering" ? (
        <>
          <datalist id="builder-gas-options">{gasNames.map((name) => <option key={name} value={name} />)}</datalist>
          <div className="builder-fields builder-fields--three">
            <label className="builder-field"><span>{tr("processEditor.sputterMode")}</span><select className="text-input" value={process.sputter_mode ?? "rf"} onChange={(event) => onChange({ ...process, sputter_mode: event.target.value })}><option value="rf">RF</option><option value="dc">DC</option><option value="pulsed_dc">{tr("processEditor.pulsedDC")}</option></select></label>
            <NumberField label={tr("processEditor.powerW")} value={process.power_w} onChange={(power_w) => onChange({ ...process, power_w })} />
            <NumberField label={tr("processEditor.pressurePa")} value={process.pressure_pa} onChange={(pressure_pa) => onChange({ ...process, pressure_pa })} />
            <label className="builder-field"><span>{tr("processEditor.gas")}</span><input className="text-input" list="builder-gas-options" value={process.gas1 ?? ""} onChange={(event) => onChange({ ...process, gas1: event.target.value })} /></label>
            <NumberField label={tr("processEditor.gasFlowSccm")} value={process.gas1_flow_sccm} onChange={(gas1_flow_sccm) => onChange({ ...process, gas1_flow_sccm })} />
            <label className="builder-field"><span>{tr("processEditor.gasOptional")}</span><input className="text-input" list="builder-gas-options" value={process.gas2 ?? ""} onChange={(event) => onChange({ ...process, gas2: event.target.value })} /></label>
            <NumberField label={tr("processEditor.gasFlowSccm2")} value={process.gas2_flow_sccm} onChange={(gas2_flow_sccm) => onChange({ ...process, gas2_flow_sccm })} />
            <NumberField label={tr("processEditor.durationS")} value={process.duration_seconds} onChange={(duration_seconds) => onChange({ ...process, duration_seconds })} step="1" />
          </div>
        </>
      ) : null}

      {process.method === "thermal_evaporation" ? (
        <div className="builder-fields builder-fields--two">
          <NumberField label={tr("processEditor.thicknessNm")} value={process.thickness_nm} onChange={(thickness_nm) => onChange({ ...process, thickness_nm })} />
          <NumberField label={tr("processEditor.rateS")} value={process.rate_angstrom_per_s} onChange={(rate_angstrom_per_s) => onChange({ ...process, rate_angstrom_per_s })} />
        </div>
      ) : null}

      {process.method === "ald" ? (
        <div className="builder-fields builder-fields--three">
          <NumberField label={tr("processEditor.thicknessNm")} value={process.thickness_nm} onChange={(thickness_nm) => onChange({ ...process, thickness_nm })} />
          <NumberField label={tr("processEditor.substrateTemperatureC")} value={process.substrate_temperature_c} onChange={(substrate_temperature_c) => onChange({ ...process, substrate_temperature_c })} />
          <NumberField label={tr("processEditor.cycles")} value={process.cycles} onChange={(cycles) => onChange({ ...process, cycles })} step="1" />
        </div>
      ) : null}
    </div>
  );
}

function defaultVcd(): VcdStage {
  return { valve: "VV02", pressure_pa: null, seconds: null };
}

function defaultBackfill(): GasBackfillStage {
  return { gas: "", flow_sccm: null, target_pressure_pa: null, hold_seconds: null };
}

function canonicalSequence(vcdCount: number, gasCount: number): string[] {
  return [
    ...Array.from({ length: vcdCount }, (_, index) => `vcd_stage${index + 1}`),
    ...Array.from({ length: gasCount }, (_, index) => `gas_backfill_stage${index + 1}`),
  ];
}

// A single ordered vacuum/gas-backfill program row. This is a UI-only shape;
// it serializes back into the stored vcd_stages / gas_backfill_stages /
// vcd_step_sequence snapshot fields via processFromUnified, and is rebuilt
// from them via unifiedFromProcess so imported snapshots round-trip without
// reordering.
export interface UnifiedStage {
  kind: "evacuate" | "gas_backfill";
  valve: string;
  pressure_pa: number | null;
  seconds: number | null;
  gas: string;
  flow_sccm: number | null;
  target_pressure_pa: number | null;
  hold_seconds: number | null;
}

function blankRow(kind: UnifiedStage["kind"]): UnifiedStage {
  return { kind, valve: "VV02", pressure_pa: null, seconds: null, gas: "", flow_sccm: null, target_pressure_pa: null, hold_seconds: null };
}

export function unifiedFromProcess(process: PerovskiteDepositionProcess): UnifiedStage[] {
  const sequence = process.vcd_step_sequence ?? canonicalSequence(process.vcd_stages.length, process.gas_backfill_stages.length);
  const rows: UnifiedStage[] = [];
  for (const entry of sequence) {
    const vcdMatch = /^vcd_stage(\d+)$/.exec(entry);
    const gasMatch = /^gas_backfill_stage(\d+)$/.exec(entry);
    if (vcdMatch) {
      const stage = process.vcd_stages[Number(vcdMatch[1]) - 1] ?? defaultVcd();
      rows.push({ ...blankRow("evacuate"), valve: stage.valve, pressure_pa: stage.pressure_pa, seconds: stage.seconds });
    } else if (gasMatch) {
      const stage = process.gas_backfill_stages[Number(gasMatch[1]) - 1] ?? defaultBackfill();
      rows.push({ ...blankRow("gas_backfill"), gas: stage.gas, flow_sccm: stage.flow_sccm, target_pressure_pa: stage.target_pressure_pa, hold_seconds: stage.hold_seconds });
    }
  }
  return rows;
}

export function processFromUnified(unified: UnifiedStage[], base: PerovskiteDepositionProcess): PerovskiteDepositionProcess {
  const vcd_stages: VcdStage[] = [];
  const gas_backfill_stages: GasBackfillStage[] = [];
  const vcd_step_sequence: string[] = [];
  let vcdIndex = 0;
  let gasIndex = 0;
  for (const stage of unified) {
    if (stage.kind === "evacuate") {
      vcdIndex += 1;
      vcd_stages.push({ valve: stage.valve, pressure_pa: stage.pressure_pa, seconds: stage.seconds });
      vcd_step_sequence.push(`vcd_stage${vcdIndex}`);
    } else {
      gasIndex += 1;
      gas_backfill_stages.push({ gas: stage.gas, flow_sccm: stage.flow_sccm, target_pressure_pa: stage.target_pressure_pa, hold_seconds: stage.hold_seconds });
      vcd_step_sequence.push(`gas_backfill_stage${gasIndex}`);
    }
  }
  return { ...base, vcd_stages, gas_backfill_stages, vcd_step_sequence };
}

interface PerovskiteProcessEditorProps {
  process: PerovskiteDepositionProcess;
  materials: Material[];
  /** Authoritative valve choices from GET /api/editor-config; falls back to
   * the local mirror while loading so the editor stays usable offline. */
  vcdValves?: readonly string[];
  onChange: (process: PerovskiteDepositionProcess) => void;
}

export function PerovskiteProcessEditor({ process, materials, vcdValves, onChange }: PerovskiteProcessEditorProps) {
  useUiLanguage();
  const gasNames = gasMaterialNames(materials);
  const valves = vcdValves ?? VCD_VALVES;
  const unified = useMemo(() => unifiedFromProcess(process), [process]);
  const issues = useMemo(() => {
    const found: { path: string; message: string }[] = [];
    completeDepositionProcess(process, found, "deposition_process", "perovskite", valves);
    return found;
  }, [process, valves]);

  function emit(next: UnifiedStage[]) {
    onChange(processFromUnified(next, process));
  }

  const evacuateCount = unified.filter((stage) => stage.kind === "evacuate").length;
  const backfillCount = unified.filter((stage) => stage.kind === "gas_backfill").length;

  function addRow() {
    emit([...unified, blankRow("evacuate")]);
  }

  return (
    <div className="builder-subeditor builder-subeditor--perovskite">
      <h3>{tr("processEditor.perovskiteDepositionProcess")}</h3>
      <p className="builder-help">{tr("processEditor.theOrderedSpinVacuumGasBackfillAndAnnealingStages")}</p>
      {issues.length > 0 ? (
        <div className="builder-inline-warning" role="status">
          <strong>{tr("processEditor.thisPerovskiteProcessIsNotCompleteYet")}</strong>
          <ul>
            {issues.map((issue, index) => <li key={`${issue.path}-${index}`}>{localizeAppText(issue.message ?? "")}</li>)}
          </ul>
          <span>{tr("processEditor.fillInTheHighlightedStagesBelowTheSaveButton")}</span>
        </div>
      ) : null}
      <SpinStages stages={process.spin_steps} max={4} onChange={(spin_steps) => onChange({ ...process, spin_steps })} />

      <div className="builder-stage-group">
        <div className="builder-subeditor__heading">
          <h4>
            {tr("processEditor.vacuumAndGasBackfillProgram")}<GroupMarker required />
            <HelpHint label={tr("processEditor.vcdProgram")}>
              <strong>{tr("processEditor.howToRecordTheVCDProgram")}</strong>
              <ul>
                <li>{tr("processEditor.rowsRunInOrderUpToFiveEvacuateRows")}</li>
                <li><strong>{tr("snapshotEditor.evacuate")}</strong> {tr("processEditor.valvePressureIntegerPaAndHoldTimeWholeSeconds")}</li>
                <li><strong>{tr("processEditor.pumpToBaseVacuum")}</strong> {tr("processEditor.pressureNotControlledSetThePressureToAndRecord")}</li>
                <li><strong>{tr("processEditor.multiPressureHolding")}</strong> {tr("processEditor.addOneRowPerSetpointTheValveMayChange")}</li>
                <li><strong>{tr("snapshotEditor.gasBackfill")}</strong> {tr("processEditor.gasMFCFlowIntegerSccmTargetPressurePaAnd")}</li>
              </ul>
            </HelpHint>
          </h4>
          <button
            type="button"
            className="button button--secondary button--small"
            disabled={unified.length >= 10 || evacuateCount >= 5}
            onClick={addRow}
          >{tr("processEditor.addStage")}</button>
        </div>
        <p className="builder-help">{tr("processEditor.atLeastOneEvacuationRowIsRequiredGasBackfill")}</p>
        <datalist id="perovskite-gas-options">{gasNames.map((name) => <option key={name} value={name} />)}</datalist>
        {unified.map((stage, index) => (
          <div className="builder-stage-row builder-stage-row--sequence" key={index}>
            <label className="builder-field builder-field--kind"><span>{tr("processEditor.stage")}{index + 1}</span>
              <select className="text-input" value={stage.kind} onChange={(event) => emit(updateAt(unified, index, { ...stage, kind: event.target.value as UnifiedStage["kind"] }))}>
                <option value="evacuate" disabled={stage.kind === "gas_backfill" && evacuateCount >= 5}>{tr("snapshotEditor.evacuate")}</option>
                <option value="gas_backfill" disabled={stage.kind === "evacuate" && backfillCount >= 5}>{tr("snapshotEditor.gasBackfill")}</option>
              </select>
            </label>
            {stage.kind === "evacuate" ? (
              <>
                <SelectField name="valve" label={tr("processEditor.valve")} value={stage.valve} options={valves} onChange={(valve) => emit(updateAt(unified, index, { ...stage, valve }))} missingOptionLabel="— select a valve —" />
                <NumberField name="pressure_pa" label={tr("processEditor.pressurePa")} value={stage.pressure_pa} onChange={(pressure_pa) => emit(updateAt(unified, index, { ...stage, pressure_pa }))} />
                <NumberField name="seconds" label={tr("processEditor.durationS")} value={stage.seconds} onChange={(seconds) => emit(updateAt(unified, index, { ...stage, seconds }))} />
              </>
            ) : (
              <>
                <label className="builder-field"><span>{tr("processEditor.gas2")}</span><input className="text-input" list="perovskite-gas-options" value={stage.gas} onChange={(event) => emit(updateAt(unified, index, { ...stage, gas: event.target.value }))} /></label>
                <NumberField name="flow_sccm" label={tr("processEditor.flowSccm")} value={stage.flow_sccm} onChange={(flow_sccm) => emit(updateAt(unified, index, { ...stage, flow_sccm }))} />
                <NumberField name="target_pressure_pa" label={tr("processEditor.targetPressurePa")} value={stage.target_pressure_pa} onChange={(target_pressure_pa) => emit(updateAt(unified, index, { ...stage, target_pressure_pa }))} />
                <NumberField name="hold_seconds" label={tr("processEditor.holdTimeS")} value={stage.hold_seconds} onChange={(hold_seconds) => emit(updateAt(unified, index, { ...stage, hold_seconds }))} />
              </>
            )}
            <button type="button" className="button button--secondary button--small builder-stage-row__remove" onClick={() => emit(removeAt(unified, index))}>{tr("snapshotEditor.remove")}</button>
          </div>
        ))}
      </div>

      <AnnealStages stages={process.anneal_steps} required onChange={(anneal_steps) => onChange({ ...process, anneal_steps })} />
    </div>
  );
}
