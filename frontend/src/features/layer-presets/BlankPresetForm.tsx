import { useMemo, useState, type FormEvent } from "react";
import { FormField } from "../../components/FormField";
import { InlineFormError } from "../../components/InlineFormError";
import { RequiredLegend } from "../../components/RequiredLegend";
import { useToast } from "../../components/Toast";
import { apiFetch } from "../../lib/api";
import { LayerProcessEditor, PerovskiteProcessEditor } from "../experiment-builder/ProcessEditor";
import { SolutionEditor } from "../experiment-builder/SolutionEditor";
import { LAYER_TYPE_DEFS } from "../experiment-builder/state";
import type { DraftIssue } from "../experiment-builder/types";
import { completeDepositionProcess } from "../experiment-builder/validation";
import { roleLabel } from "./presetSummary";
import type {
  DeviceLayer,
  LayerPreset,
  LayerProcess,
  LayerSolution,
  Material,
  PerovskiteDepositionProcess,
} from "../../types/api";
import { PresetPreview } from "./PresetPreview";

/**
 * Author a preset from scratch inside the new-preset workspace — the
 * from-zero path that also works when no saved snapshot exists yet. Mirrors
 * the backend's preset contract: a perovskite preset must carry a complete
 * deposition-process snapshot, every other layer type may store an empty
 * solution/process and leave the experiment-specific setpoints to be filled
 * in per experiment.
 */
export function BlankPresetForm({
  canCreateShared,
  materials,
  vcdValves,
  onCreated,
  onCancel,
}: {
  canCreateShared: boolean;
  materials: Material[];
  vcdValves: readonly string[];
  onCreated: (preset: LayerPreset) => void;
  onCancel: () => void;
}) {
  const { show } = useToast();
  const [layerType, setLayerType] = useState("");
  const [presetName, setPresetName] = useState("");
  const [layerName, setLayerName] = useState("");
  const [scope, setScope] = useState<"personal" | "shared">(canCreateShared ? "shared" : "personal");
  const [solution, setSolution] = useState<LayerSolution | null>(null);
  const [layerProcess, setLayerProcess] = useState<LayerProcess | null>(null);
  const [depositionProcess, setDepositionProcess] = useState<PerovskiteDepositionProcess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const definition = LAYER_TYPE_DEFS.find((item) => item.layerType === layerType);
  const isPerovskite = layerType === "perovskite";

  function selectLayerType(nextType: string) {
    setLayerType(nextType);
    const next = LAYER_TYPE_DEFS.find((item) => item.layerType === nextType);
    if (next && !layerName.trim()) setLayerName(next.label);
    setSolution(null);
    setLayerProcess(null);
    setDepositionProcess(nextType === "perovskite"
      ? { method: "spin_coating_vcd", spin_steps: [], vcd_stages: [], gas_backfill_stages: [], vcd_step_sequence: [], anneal_steps: [] }
      : null);
  }

  // Same gate as the revision editor: a perovskite preset is copied verbatim
  // into baselines and experiments, so every spin/VCD/anneal stage must be
  // complete before the preset can be saved.
  const issues = useMemo<DraftIssue[]>(() => {
    const found: DraftIssue[] = [];
    if (!presetName.trim()) found.push({ path: "name", message: "Enter a preset name." });
    if (!layerName.trim()) found.push({ path: "layer.name", message: "Enter a layer name." });
    if (depositionProcess) {
      completeDepositionProcess(depositionProcess, found, "deposition_process", "perovskite", vcdValves);
    }
    return found;
  }, [presetName, layerName, depositionProcess, vcdValves]);

  async function createFromBlank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!definition || issues.length > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const layer: DeviceLayer = {
        layer_type: definition.layerType,
        role: definition.role,
        name: layerName.trim(),
        preset_id: null,
        solution,
        process: layerProcess,
      };
      const created = await apiFetch<LayerPreset>("/api/layer-presets", {
        method: "POST",
        body: {
          name: presetName.trim(),
          layer,
          deposition_process: isPerovskite ? depositionProcess : null,
          scope: canCreateShared ? scope : "personal",
        },
      });
      onCreated(created);
      setPresetName("");
      setLayerName("");
      setLayerType("");
      setSolution(null);
      setLayerProcess(null);
      setDepositionProcess(null);
      show("Layer preset created from scratch.", "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the layer preset.");
    } finally {
      setSubmitting(false);
    }
  }

  const previewLayer: DeviceLayer | null = definition
    ? {
        layer_type: definition.layerType,
        role: definition.role,
        name: layerName.trim(),
        preset_id: null,
        solution,
        process: layerProcess,
      }
    : null;

  return (
    <form onSubmit={(event) => void createFromBlank(event)}>
        <div className="builder-fields builder-fields--two">
          <FormField label="Layer type" htmlFor="blank-preset-type" required>
            <select
              id="blank-preset-type"
              className="text-input"
              required
              value={layerType}
              onChange={(event) => selectLayerType(event.target.value)}
            >
              <option value="">Choose a layer type…</option>
              {LAYER_TYPE_DEFS.map((item) => (
                <option key={item.layerType} value={item.layerType}>{item.label} · {roleLabel(item.role)}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Preset name" htmlFor="blank-preset-name" required>
            <input
              id="blank-preset-name"
              className="text-input"
              required
              maxLength={120}
              value={presetName}
              onChange={(event) => setPresetName(event.target.value)}
            />
          </FormField>
        </div>
        {definition ? (
          <>
            <FormField label="Layer name" htmlFor="blank-preset-layer-name" required>
              <input
                id="blank-preset-layer-name"
                className="text-input"
                required
                maxLength={120}
                value={layerName}
                onChange={(event) => setLayerName(event.target.value)}
              />
            </FormField>
            <p className="builder-help">Role {roleLabel(definition.role)} — derived from the layer type and fixed for this preset.</p>
            <RequiredLegend />
            <SolutionEditor idPrefix="blank-preset" solution={solution} materials={materials} onChange={setSolution} />
            {isPerovskite ? (
              depositionProcess ? (
                <PerovskiteProcessEditor process={depositionProcess} materials={materials} vcdValves={vcdValves} onChange={setDepositionProcess} />
              ) : null
            ) : (
              <LayerProcessEditor layerType={layerType} process={layerProcess} materials={materials} onChange={setLayerProcess} />
            )}
          </>
        ) : null}
        {canCreateShared ? (
          <FormField label="Preset scope" htmlFor="blank-preset-scope" required>
            <select
              id="blank-preset-scope"
              className="text-input"
              value={scope}
              onChange={(event) => setScope(event.target.value as "personal" | "shared")}
            >
              <option value="shared">Shared directory</option>
              <option value="personal">Personal</option>
            </select>
          </FormField>
        ) : null}
        {definition && previewLayer ? (
          <PresetPreview
            values={{
              name: presetName,
              layer: previewLayer,
              depositionProcess: isPerovskite ? depositionProcess : null,
              scope: canCreateShared ? scope : "personal",
            }}
            vcdValves={vcdValves}
            action="create"
          />
        ) : null}
        <InlineFormError message={error} />
        {issues.length > 0 && layerType ? (
          <div className="builder-issue-summary" role="alert" aria-labelledby="blank-preset-issues-title">
            <h3 id="blank-preset-issues-title">Complete these values before saving</h3>
            <ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}><code>{issue.path}</code> — {issue.message}</li>)}</ul>
          </div>
        ) : null}
        <div className="lib-savebar">
          <div className="lib-savebar__actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={submitting || !definition || issues.length > 0}
            >
              {submitting ? "Creating…" : canCreateShared && scope === "shared" ? "Create shared preset" : "Create personal preset"}
            </button>
            <button className="button button--secondary" type="button" onClick={onCancel}>Cancel</button>
          </div>
          <span className="lib-muted">Cancel discards the entered values without sending any request.</span>
        </div>
      </form>
  );
}
