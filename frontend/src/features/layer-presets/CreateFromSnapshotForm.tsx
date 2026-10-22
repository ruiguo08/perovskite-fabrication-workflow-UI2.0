import { localizeAppText } from "../../i18n";
import { enumLabel, translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import { useState, type FormEvent } from "react";
import { FormField } from "../../components/FormField";
import { InlineFormError } from "../../components/InlineFormError";
import { useToast } from "../../components/Toast";
import { apiFetch } from "../../lib/api";
import type { LayerPreset } from "../../types/api";
import { roleLabel } from "./presetSummary";
import { PresetPreview } from "./PresetPreview";

/**
 * Create a new preset by copying the complete snapshot of an existing active
 * preset, inside the new-preset workspace. This is the "copy as another
 * program" path: the new preset is an independent record with its own
 * revision history, and the source preset is unchanged. Saving a new version
 * of the same preset is the separate "Save new revision" action in the edit
 * workspace (an in-place revision, not a copy).
 */
export function CreateFromSnapshotForm({
  activeRows,
  canCreateShared,
  vcdValves,
  onCreated,
  onCancel,
}: {
  /** Every active preset the current user can see — unfiltered, so list
   * filters never change or hide an already-chosen source. */
  activeRows: LayerPreset[];
  canCreateShared: boolean;
  vcdValves: readonly string[];
  onCreated: (preset: LayerPreset) => void;
  onCancel: () => void;
}) {
  useUiLanguage();
  const { show } = useToast();
  const [sourceId, setSourceId] = useState("");
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"personal" | "shared">(canCreateShared ? "shared" : "personal");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const explicitSource = activeRows.find((preset) => String(preset.id) === sourceId);
  // Before the user picks anything, default to the first active preset. An
  // explicit selection that is no longer an active, visible preset (e.g. it
  // was deactivated while the form was open) must never silently fall back
  // to another row.
  const selectedSource = explicitSource ?? (sourceId === "" ? activeRows[0] : undefined);
  const sourceUnavailable = sourceId !== "" && !explicitSource;

  async function createPreset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sourceUnavailable) {
      setError("The selected source preset is no longer available. Choose another source preset.");
      return;
    }
    if (!selectedSource) {
      setError("Select an active source preset.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<LayerPreset>("/api/layer-presets", {
        method: "POST",
        body: {
          name: name.trim(),
          layer: selectedSource.layer,
          deposition_process: selectedSource.deposition_process,
          scope: canCreateShared ? scope : "personal",
        },
      });
      onCreated(created);
      setName("");
      show("Layer preset created from a complete snapshot.", "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the layer preset.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void createPreset(event)}>
      <p className="builder-help">
        {tr("createFromSnapshotForm.copiesTheSelectedPresetSCompleteValuesIntoA")}<strong>{tr("createFromSnapshotForm.newIndependentPreset")}</strong> {tr("createFromSnapshotForm.withItsOwnHistoryTheSourcePresetIsUnchanged")}<strong>{tr("createFromSnapshotForm.editPreset")}</strong> {tr("createFromSnapshotForm.andSaveANewRevision")}</p>
      <div className="preset-create-grid">
        <FormField label={tr("createFromSnapshotForm.newPresetName")} htmlFor="new-preset-name" required>
          <input id="new-preset-name" className="text-input" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
        </FormField>
        <FormField label={tr("createFromSnapshotForm.sourcePreset")} htmlFor="source-preset" required>
          <select id="source-preset" className="text-input" required value={selectedSource ? String(selectedSource.id) : sourceId} onChange={(event) => setSourceId(event.target.value)}>
            {sourceUnavailable ? (
              <option value={sourceId}>{tr("createFromSnapshotForm.unavailableSourcePreset")}</option>
            ) : null}
            {activeRows.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} · {roleLabel(preset.layer.role)} · {enumLabel(preset.scope)}</option>)}
          </select>
        </FormField>
        {canCreateShared ? (
          <FormField label={tr("blankPresetForm.presetScope")} htmlFor="new-preset-scope" required>
            <select id="new-preset-scope" className="text-input" value={scope} onChange={(event) => setScope(event.target.value as "personal" | "shared")}>
              <option value="shared">{tr("blankPresetForm.sharedDirectory")}</option>
              <option value="personal">{tr("blankPresetForm.personal")}</option>
            </select>
          </FormField>
        ) : null}
      </div>
      {sourceUnavailable ? (
        <div className="inline-form-error" role="alert">
          {tr("createFromSnapshotForm.theSelectedSourcePresetIsNoLongerAvailableIt")}</div>
      ) : null}
      {selectedSource ? (
        <PresetPreview
          values={{
            name,
            layer: selectedSource.layer,
            depositionProcess: selectedSource.deposition_process,
            scope: canCreateShared ? scope : "personal",
          }}
          vcdValves={vcdValves}
          action="create"
        />
      ) : null}
      <InlineFormError message={localizeAppText(error ?? "")} />
      <div className="lib-savebar">
        <div className="lib-savebar__actions">
          <button className="button button--primary" type="submit" disabled={submitting || !selectedSource || sourceUnavailable}>
            {submitting ? tr("blankPresetForm.creating") : canCreateShared && scope === "shared" ? tr("blankPresetForm.createSharedPreset") : tr("blankPresetForm.createPersonalPreset")}
          </button>
          <button className="button button--secondary" type="button" onClick={onCancel}>{tr("completeBatchDialog.cancel")}</button>
        </div>
        <span className="lib-muted">{tr("blankPresetForm.cancelDiscardsTheEnteredValuesWithoutSendingAnyRequest")}</span>
      </div>
    </form>
  );
}
