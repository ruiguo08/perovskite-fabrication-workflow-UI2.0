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
  const [createMode, setCreateMode] = useState<"scratch" | "copy">("scratch");

  if (mode.kind === "revise") {
    const preset = mode.preset;
    return (
      <section className="lib-editor" aria-labelledby="preset-workspace-title">
        <h2 className="lib-editor__title" id="preset-workspace-title">Edit {preset.name}</h2>
        <p className="lib-editor__subtitle">
          Current revision r{preset.current_revision_number} — saving creates revision r{preset.current_revision_number + 1}. Frozen experiment snapshots keep their own values.
        </p>
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
      <h2 className="lib-editor__title" id="preset-workspace-title">New preset</h2>
      <p className="lib-editor__subtitle">
        Presets are optional single-layer templates — experiments can also be planned from scratch without one.
      </p>
      <div className="lib-modes" role="group" aria-label="Creation mode">
        <button
          type="button"
          className="button button--secondary"
          aria-pressed={createMode === "scratch"}
          onClick={() => setCreateMode("scratch")}
        >
          From scratch
        </button>
        <button
          type="button"
          className="button button--secondary"
          aria-pressed={createMode === "copy"}
          disabled={activeRows.length === 0}
          title={activeRows.length === 0 ? "No saved presets to copy yet" : undefined}
          onClick={() => setCreateMode("copy")}
        >
          Copy existing preset
        </button>
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
