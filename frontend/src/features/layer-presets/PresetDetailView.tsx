import { useState } from "react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { InlineFormError } from "../../components/InlineFormError";
import { StatusBadge } from "../../components/StatusBadge";
import { VersionHistory } from "../../components/VersionHistory";
import { useToast } from "../../components/Toast";
import { apiFetch } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { LayerPreset, LayerPresetVersion } from "../../types/api";
import { unifiedFromProcess } from "../experiment-builder/ProcessEditor";
import { LibFacts, LibSection, LibSteps, LibTag, LibTags } from "../library/LibraryPrimitives";
import { PresetDiffViewer } from "./PresetDiffViewer";
import {
  formulationFacts,
  layerMethodLabel,
  layerTypeLabel,
  presetCompleteness,
  presetSummaryFacts,
  roleLabel,
} from "./presetSummary";

/**
 * Detail surface for one layer preset: layer and formulation, the deposition
 * steps in execution order, version history and comparison, and collapsed
 * technical provenance. Promotion and deactivation keep their existing
 * confirmation semantics with visible failures.
 *
 * `variant` distinguishes the regular surfaces ("standard" — own personal or
 * shared presets) from the promotion-review readout ("promotable" — another
 * user's personal snapshot authorized for promotion): the promotable variant
 * is a read-only snapshot with an authorized Promote action and never
 * requests version history, which stays unavailable to this actor.
 */
export function PresetDetailView({
  preset,
  vcdValves,
  variant = "standard",
  canEdit,
  canDeactivate,
  canPromote,
  onChanged,
  onEdit,
  onBack,
}: {
  preset: LayerPreset;
  vcdValves: readonly string[];
  variant?: "standard" | "promotable";
  canEdit: boolean;
  canDeactivate: boolean;
  /** Independent flag: staff may promote an active personal preset (their
   * own from the regular catalog, or another user's from the promotion
   * review); never inferred from the deactivate right. */
  canPromote: boolean;
  onChanged: (preset: LayerPreset) => void;
  onEdit: (presetId: number) => void;
  onBack: () => void;
}) {
  const { show } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmingPromotion, setConfirmingPromotion] = useState(false);
  const promotable = variant === "promotable";

  const isPerovskite = preset.layer.layer_type === "perovskite";
  const completeness = presetCompleteness(preset, vcdValves);
  const editable = !promotable && canEdit && preset.status === "active";
  const promotableNow = canPromote && preset.scope === "personal" && preset.status === "active";

  async function promote() {
    setConfirmingPromotion(false);
    setError(null);
    try {
      const updated = await apiFetch<LayerPreset>(`/api/layer-presets/${preset.id}/promote`, { method: "POST" });
      onChanged(updated);
      show(`${updated.name} is now shared with every student.`, "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to promote the layer preset.");
    }
  }

  async function deactivate() {
    setConfirming(false);
    setError(null);
    try {
      await apiFetch<void>(`/api/layer-presets/${preset.id}`, { method: "DELETE" });
      onChanged({ ...preset, status: "inactive" });
      show("Layer preset deactivated.", "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to deactivate the layer preset.");
    }
  }

  const titleId = `preset-detail-title-${preset.id}`;
  const process = preset.deposition_process;
  const spinSteps = isPerovskite
    ? process?.spin_steps ?? []
    : preset.layer.process?.method === "spin_coating"
      ? preset.layer.process.spin_steps ?? []
      : [];
  const annealSteps = isPerovskite
    ? process?.anneal_steps ?? []
    : preset.layer.process?.method === "spin_coating"
      ? preset.layer.process.anneal_steps ?? []
      : [];

  return (
    <article aria-labelledby={titleId}>
      <button type="button" className="button button--secondary lib-back" onClick={onBack}>
        ← Back to library
      </button>
      <div className="lib-detail">
        <header className="lib-detail__head">
          <div>
            <h2 className="lib-detail__title" id={titleId}>{preset.name}</h2>
            <LibTags>
              <LibTag tone={preset.scope === "shared" ? "info" : undefined}>{roleLabel(preset.layer.role)}</LibTag>
              <LibTag>{layerTypeLabel(preset.layer.layer_type)}</LibTag>
              <LibTag tone="scope">{preset.scope}</LibTag>
            </LibTags>
            <p className="lib-record__subtitle">
              {preset.layer.name} · {isPerovskite ? "Spin coating + VCD" : layerMethodLabel(preset.layer.process?.method ?? "")}
            </p>
          </div>
          <div className="lib-actions">
            <StatusBadge status={preset.status} />
            <LibTag tone="scope">r{preset.current_revision_number}</LibTag>
            {editable ? (
              <button type="button" className="button button--primary" onClick={() => onEdit(preset.id)}>Edit preset</button>
            ) : null}
            {promotableNow ? (
              <button type="button" className="button button--secondary" onClick={() => setConfirmingPromotion(true)}>
                Promote to shared
              </button>
            ) : null}
            {canDeactivate && preset.status === "active" ? (
              <button type="button" className="button button--danger" onClick={() => setConfirming(true)}>
                Deactivate {preset.name}
              </button>
            ) : null}
          </div>
        </header>

        {!completeness.experimentReady ? (
          <div className="lib-card-note" role="note">
            Partial template — this preset is legal to keep and revise, but it is not a complete experiment layer yet. Missing values are listed per section below.
          </div>
        ) : (
          <LibTags>
            {isPerovskite && completeness.templateComplete ? <LibTag tone="ok">Template complete</LibTag> : null}
            <LibTag tone="ok">Experiment-ready</LibTag>
          </LibTags>
        )}

        <LibSection title="Layer and formulation" labelledBy={`preset-detail-formulation-${preset.id}`}>
          <LibFacts facts={[
            // Formulation values come solely from formulationFacts so every
            // ingredient is listed exactly once with its full reading.
            ...presetSummaryFacts(preset).filter((fact) => !["Formulation", "Solids", "Solvents", "Stock dispersion", "Stock volume", "Revision", "Scope"].includes(fact.label)),
            ...formulationFacts(preset.layer),
            { label: "Revision", value: `r${preset.current_revision_number}` },
            { label: "Scope", value: preset.scope },
          ]} />
        </LibSection>

        <LibSection
          title="Process in execution order"
          labelledBy={`preset-detail-process-${preset.id}`}
          hint={isPerovskite
            ? "The perovskite program runs spin coating, then the vacuum/gas-backfill rows in their recorded order, then annealing."
            : "Recorded process values for this layer type."}
        >
          {spinSteps.length > 0 ? (
            <>
              <h4 className="lib-section-hint">Spin coating</h4>
              <LibSteps steps={spinSteps.map((step, index) => ({
                title: `Stage ${index + 1}`,
                detail: `${step.rpm ?? "—"} rpm · ${step.seconds ?? "—"} s · ${step.acceleration_rpm_per_s ?? "—"} rpm/s`,
              }))} />
            </>
          ) : null}
          {isPerovskite && process ? (
            <>
              <h4 className="lib-section-hint">Vacuum and gas-backfill program</h4>
              <LibSteps steps={unifiedFromProcess(process).map((stage, index) => (
                stage.kind === "evacuate"
                  ? {
                      title: `Evacuate (stage ${index + 1})`,
                      detail: `${stage.valve} · ${stage.pressure_pa ?? "—"} Pa · ${stage.seconds ?? "—"} s`,
                    }
                  : {
                      title: `Gas backfill (stage ${index + 1})`,
                      detail: `${stage.gas || "—"} · ${stage.flow_sccm ?? "—"} sccm → ${stage.target_pressure_pa ?? "—"} Pa · hold ${stage.hold_seconds ?? "—"} s`,
                    }
              ))} />
            </>
          ) : null}
          {!isPerovskite && preset.layer.process ? <LayerProcessFacts preset={preset} /> : null}
          {annealSteps.length > 0 ? (
            <>
              <h4 className="lib-section-hint">Annealing</h4>
              <LibSteps steps={annealSteps.map((step, index) => ({
                title: `Stage ${index + 1}`,
                detail: `${step.temperature_c ?? "—"} °C · ${step.seconds ?? "—"} s`,
              }))} />
            </>
          ) : null}
          {(isPerovskite && !process) || (!isPerovskite && !preset.layer.process) ? (
            <p className="lib-muted">No process recorded for this preset.</p>
          ) : null}
        </LibSection>

        <LibSection
          title="Version history and comparison"
          labelledBy={`preset-detail-versions-${preset.id}`}
          hint={promotable
            ? "Version history and comparison become available after the preset is promoted to shared."
            : undefined}
        >
          {!promotable ? (
            <>
              <PresetDiffViewer preset={preset} />
              <VersionHistory<LayerPresetVersion>
                endpoint={`/api/layer-presets/${preset.id}/versions`}
                renderSnapshot={(version) => <pre className="snapshot-json">{JSON.stringify({ layer: version.layer, deposition_process: version.deposition_process }, null, 2)}</pre>}
              />
            </>
          ) : null}
        </LibSection>

        <LibSection title="Technical provenance" labelledBy={`preset-detail-provenance-${preset.id}`}>
          <details className="lib-provenance">
            <summary>Canonical hash, source key, and schema</summary>
            <LibFacts singleColumn facts={[
              { label: "Canonical hash", value: preset.canonical_hash },
              { label: "Preset key", value: preset.preset_key },
              { label: "Created", value: formatDateTime(preset.created_at) },
              { label: "Updated", value: formatDateTime(preset.updated_at) },
            ]} />
          </details>
        </LibSection>

        <InlineFormError message={error} />
      </div>

      <ConfirmDialog
        open={confirmingPromotion}
        title="Promote layer preset to shared"
        message={`Every student will be able to select ${preset.name} as a starting point. Promotion is one-way: the preset cannot be made personal again.`}
        confirmLabel="Promote to shared"
        onConfirm={() => void promote()}
        onCancel={() => setConfirmingPromotion(false)}
      />
      <ConfirmDialog
        open={confirming}
        title="Deactivate layer preset"
        message="Existing experiment snapshots remain unchanged. This preset will no longer be available for new selections."
        confirmLabel="Deactivate preset"
        destructive
        onConfirm={() => void deactivate()}
        onCancel={() => setConfirming(false)}
      />
    </article>
  );
}

function LayerProcessFacts({ preset }: { preset: LayerPreset }) {
  const facts = presetSummaryFacts(preset).filter((fact) =>
    ["Spin stages", "Annealing", "Process values"].includes(fact.label));
  return <LibFacts facts={facts} />;
}
