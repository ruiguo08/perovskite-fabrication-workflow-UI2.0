import { localizeAppText } from "../../i18n";
import { useMemo } from "react";
import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSession } from "../../auth/session";
import { FormField } from "../../components/FormField";
import { InlineFormError } from "../../components/InlineFormError";
import { RequiredLegend } from "../../components/RequiredLegend";
import { useToast } from "../../components/Toast";
import { apiFetch } from "../../lib/api";
import { LayerProcessEditor, PerovskiteProcessEditor } from "../experiment-builder/ProcessEditor";
import { SolutionEditor } from "../experiment-builder/SolutionEditor";
import type { DraftIssue } from "../experiment-builder/types";
import { completeDepositionProcess } from "../experiment-builder/validation";
import type {
  DeviceLayer,
  LayerPreset,
  LayerProcess,
  LayerSolution,
  Material,
  PerovskiteDepositionProcess,
} from "../../types/api";
import { createPresetDraftStore } from "./presetDraftStorage";
import { roleLabel } from "./presetSummary";
import { PresetPreview } from "./PresetPreview";

/**
 * In-place revision editor for one preset, rendered inside the edit
 * workspace. Saving appends a new immutable revision to the same preset
 * ("save next version") — creating an independent preset from these values
 * is the separate "Copy existing preset" workspace.
 *
 * Unsaved edits are persisted per user in the browser so page switches,
 * reloads, and failed saves keep the entered values; the draft is cleared on
 * a successful save or explicit discard.
 */
export function PresetReviseForm({
  preset,
  materials,
  vcdValves,
  onSaved,
  onCancel,
}: {
  preset: LayerPreset;
  materials: Material[];
  vcdValves: readonly string[];
  onSaved: (preset: LayerPreset) => void;
  onCancel: () => void;
}) {
  useUiLanguage();
  const { show } = useToast();
  const { user } = useSession();
  const presetDraftStore = useMemo(() => createPresetDraftStore(preset.id, {
    name: preset.name,
    layerName: preset.layer.name,
    solution: preset.layer.solution,
    layerProcess: preset.layer.process ?? null,
    depositionProcess: preset.deposition_process,
  }), [preset]);
  const [name, setName] = useState(preset.name);
  const [layerName, setLayerName] = useState(preset.layer.name);
  const [solution, setSolution] = useState<LayerSolution | null>(preset.layer.solution);
  const [layerProcess, setLayerProcess] = useState<LayerProcess | null>(preset.layer.process ?? null);
  const [depositionProcess, setDepositionProcess] = useState<PerovskiteDepositionProcess | null>(preset.deposition_process);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const restoreAttempted = useRef(false);

  // A perovskite preset's deposition snapshot is copied verbatim into baselines
  // and experiments, so — like the backend — block saving until every spin/VCD/
  // anneal stage is complete. Layer processes may stay incomplete on purpose
  // (experiment-specific setpoints are filled in per experiment).
  const presetIssues = useMemo<DraftIssue[]>(() => {
    const found: DraftIssue[] = [];
    if (depositionProcess) {
      completeDepositionProcess(depositionProcess, found, "deposition_process", "perovskite", vcdValves);
    }
    return found;
  }, [depositionProcess, vcdValves]);

  useEffect(() => {
    if (user === null || restoreAttempted.current) return;
    restoreAttempted.current = true;
    const stored = presetDraftStore.load(user.id);
    if (stored !== null) {
      setName(stored.name);
      setLayerName(stored.layerName);
      setSolution(stored.solution);
      setLayerProcess(stored.layerProcess);
      setDepositionProcess(stored.depositionProcess);
      setRestoredDraft(true);
    }
  }, [user, presetDraftStore]);

  useEffect(() => {
    if (user === null) return;
    presetDraftStore.save(user.id, { name, layerName, solution, layerProcess, depositionProcess });
  }, [user, presetDraftStore, name, layerName, solution, layerProcess, depositionProcess]);

  function discardRestoredDraft() {
    if (user !== null) presetDraftStore.clear(user.id);
    setName(preset.name);
    setLayerName(preset.layer.name);
    setSolution(preset.layer.solution);
    setLayerProcess(preset.layer.process ?? null);
    setDepositionProcess(preset.deposition_process);
    setRestoredDraft(false);
  }

  async function revise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const layer = {
        ...preset.layer,
        name: layerName.trim(),
        solution,
        process: layerProcess,
      } as DeviceLayer;
      const updated = await apiFetch<LayerPreset>(`/api/layer-presets/${preset.id}`, {
        method: "PUT",
        body: { name: name.trim(), layer, deposition_process: depositionProcess, scope: preset.scope },
      });
      if (user !== null) presetDraftStore.clear(user.id);
      onSaved(updated);
      setRestoredDraft(false);
      show("A new immutable preset revision was saved.", "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to revise the layer preset.");
    } finally {
      setSubmitting(false);
    }
  }

  const previewLayer: DeviceLayer = {
    ...preset.layer,
    name: layerName.trim(),
    solution,
    process: layerProcess,
  };

  return (
    <form className="inline-editor__body" onSubmit={(event) => void revise(event)}>
      {restoredDraft ? (
        <div className="draft-restored-note" role="status">
          <span>{tr("presetReviseForm.unsavedEditsToThisPresetWereRestoredFromYour")}</span>
          <button type="button" className="button button--secondary button--small" onClick={discardRestoredDraft}>{tr("presetReviseForm.discardEdits")}</button>
        </div>
      ) : null}
      <FormField label={tr("blankPresetForm.presetName")} htmlFor={`preset-name-${preset.id}`} required>
        <input id={`preset-name-${preset.id}`} className="text-input" required value={name} onChange={(event) => setName(event.target.value)} />
      </FormField>
      <FormField label={tr("conditionPlanner.layerName")} htmlFor={`preset-layer-name-${preset.id}`} required>
        <input id={`preset-layer-name-${preset.id}`} className="text-input" required value={layerName} onChange={(event) => setLayerName(event.target.value)} />
      </FormField>
      <p className="builder-help">{tr("presetReviseForm.layerType")}<code>{preset.layer.layer_type}</code> {tr("presetReviseForm.role")}{roleLabel(preset.layer.role)}{preset.layer.preset_id ? tr("presetReviseForm.sourceKeyKey", { "key": preset.layer.preset_id }) : ""}{tr("presetReviseForm.theseIdentityFieldsAreFixedForThisPreset")}</p>
      <RequiredLegend />

      <SolutionEditor idPrefix={`preset-${preset.id}`} solution={solution} materials={materials} onChange={setSolution} />
      <LayerProcessEditor layerType={preset.layer.layer_type} process={layerProcess} materials={materials} onChange={setLayerProcess} />

      {depositionProcess ? (
        <PerovskiteProcessEditor process={depositionProcess} materials={materials} vcdValves={vcdValves} onChange={setDepositionProcess} />
      ) : (
        <p className="builder-empty-editor">{tr("presetReviseForm.noPerovskiteDepositionProcessThisLayerTypeRecordsIts")}</p>
      )}

      <PresetPreview
        values={{
          name,
          layer: previewLayer,
          depositionProcess,
          scope: preset.scope,
          nextRevision: preset.current_revision_number + 1,
        }}
        vcdValves={vcdValves}
        action="revise"
      />

      <InlineFormError message={localizeAppText(error ?? "")} />
      {presetIssues.length > 0 ? (
        <div className="builder-issue-summary" role="alert" aria-labelledby={`preset-issues-title-${preset.id}`}>
          <h3 id={`preset-issues-title-${preset.id}`}>{tr("baselineAuthoring.completeTheseValuesBeforeSaving")}</h3>
          <ul>{presetIssues.map((issue, index) => <li key={`${issue.path}-${index}`}><code>{issue.path}</code> — {localizeAppText(issue.message ?? "")}</li>)}</ul>
        </div>
      ) : null}
      <div className="lib-savebar">
        <div className="lib-savebar__actions">
          <button className="button button--secondary" type="submit" disabled={submitting || presetIssues.length > 0}>{tr("baselineAuthoring.saveNewRevision")}</button>
          <button className="button button--secondary" type="button" onClick={onCancel}>{tr("completeBatchDialog.cancel")}</button>
        </div>
        <span className="lib-muted">{tr("presetReviseForm.savingCreatesRevisionR")}{preset.current_revision_number + 1}{tr("presetReviseForm.existingExperimentSnapshotsAreNeverChanged")}</span>
      </div>
    </form>
  );
}
