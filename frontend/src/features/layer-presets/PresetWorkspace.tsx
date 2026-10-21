import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import { useState } from "react";
import type { LayerPreset, Material } from "../../types/api";
import { BlankPresetForm } from "./BlankPresetForm";
import { CreateFromSnapshotForm } from "./CreateFromSnapshotForm";
import { PresetReviseForm } from "./PresetReviseForm";

export type PresetWorkspaceMode =
  | { kind: "create" }
  | { kind: "revise"; preset: LayerPreset };

/**
 * Creation and edit workspace for layer presets, opened from the browse view
 * by an explicit action. Creation offers From scratch / Copy existing preset;
 * editing is always an in-place new revision of one named preset.
 */
export function PresetWorkspace({
  mode,
  activeRows,
  materials,
  vcdValves,
  canCreateShared,
  onSaved,
  onCancel,
}: {
  mode: PresetWorkspaceMode;
  activeRows: LayerPreset[];
  materials: Material[];
  vcdValves: readonly string[];
  canCreateShared: boolean;
  /** Called with the saved preset; the page shows the saved record. */
  onSaved: (preset: LayerPreset) => void;
  onCancel: () => void;
}) {
  useUiLanguage();
  const [createMode, setCreateMode] = useState<"scratch" | "copy">("scratch");

  if (mode.kind === "revise") {
    const preset = mode.preset;
    return (
      <section className="lib-editor" aria-labelledby="preset-workspace-title">
        <h2 className="lib-editor__title" id="preset-workspace-title">{tr("presetWorkspace.edit")}{preset.name}</h2>
        <p className="lib-editor__subtitle">
          {tr("presetWorkspace.currentRevisionR")}{preset.current_revision_number} {tr("presetWorkspace.savingCreatesRevisionR")}{preset.current_revision_number + 1}{tr("presetWorkspace.frozenExperimentSnapshotsKeepTheirOwnValues")}</p>
        <PresetReviseForm
          preset={preset}
          materials={materials}
          vcdValves={vcdValves}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      </section>
    );
  }

  return (
    <section className="lib-editor" aria-labelledby="preset-workspace-title">
      <h2 className="lib-editor__title" id="preset-workspace-title">{tr("presetWorkspace.newPreset")}</h2>
      <p className="lib-editor__subtitle">
        {tr("presetWorkspace.presetsAreOptionalSingleLayerTemplatesExperimentsCanAlso")}</p>
      <div className="lib-modes" role="group" aria-label={tr("presetWorkspace.creationMode")}>
        <button
          type="button"
          className="button button--secondary"
          aria-pressed={createMode === "scratch"}
          onClick={() => setCreateMode("scratch")}
        >
          {tr("presetWorkspace.fromScratch")}</button>
        <button
          type="button"
          className="button button--secondary"
          aria-pressed={createMode === "copy"}
          disabled={activeRows.length === 0}
          title={activeRows.length === 0 ? tr("presetWorkspace.noSavedPresetsToCopyYet") : undefined}
          onClick={() => setCreateMode("copy")}
        >
          {tr("presetWorkspace.copyExistingPreset")}</button>
      </div>
      {createMode === "scratch" ? (
        <BlankPresetForm
          canCreateShared={canCreateShared}
          materials={materials}
          vcdValves={vcdValves}
          onCreated={onSaved}
          onCancel={onCancel}
        />
      ) : (
        <CreateFromSnapshotForm
          activeRows={activeRows}
          canCreateShared={canCreateShared}
          vcdValves={vcdValves}
          onCreated={onSaved}
          onCancel={onCancel}
        />
      )}
    </section>
  );
}
