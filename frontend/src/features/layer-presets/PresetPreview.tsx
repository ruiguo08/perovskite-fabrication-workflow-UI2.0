import type { DeviceLayer, PerovskiteDepositionProcess } from "../../types/api";
import { PresetSummaryCard } from "./PresetSummaryCard";
import type { PresetSummaryInput } from "./presetSummary";

export interface PresetPreviewValues {
  name: string;
  layer: DeviceLayer;
  depositionProcess: PerovskiteDepositionProcess | null;
  scope: "personal" | "shared";
  /** Revision number this save will produce (revise flow only). */
  nextRevision?: number;
}

/**
 * Live preview shown before a preset is created or revised. It renders exactly
 * the summary the saved preset will present — without inventing revision
 * numbers: creates preview r1, revisions preview the next revision number —
 * plus the completeness gaps of the values currently in the form.
 */
export function PresetPreview({
  values,
  vcdValves,
  action,
}: {
  values: PresetPreviewValues;
  vcdValves: readonly string[];
  /** `create` — a new independent preset; `revise` — the next revision of an existing preset. */
  action: "create" | "revise";
}) {
  const preview: PresetSummaryInput = {
    layer: values.layer,
    deposition_process: values.depositionProcess,
    scope: values.scope,
    current_revision_number: action === "create" ? 1 : values.nextRevision ?? 1,
    status: "active",
  };
  const subject = values.name.trim() || "(unnamed)";
  return (
    <div className="preset-preview" role="note" aria-label="Preset preview">
      <h4 className="preset-preview__title">
        {action === "create"
          ? <>Preview — this creates the new independent preset <strong>{subject}</strong> ({values.scope})</>
          : <>Preview — this saves revision <strong>r{values.nextRevision ?? "—"}</strong> of <strong>{subject}</strong> ({values.scope})</>}
      </h4>
      <PresetSummaryCard preset={preview} vcdValves={vcdValves} />
    </div>
  );
}
