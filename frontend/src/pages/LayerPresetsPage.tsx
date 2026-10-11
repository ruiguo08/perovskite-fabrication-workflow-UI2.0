import { useCallback, useMemo, useState } from "react";
import { useSession } from "../auth/session";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { InlineFormError } from "../components/InlineFormError";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../components/Toast";
import { apiFetch } from "../lib/api";
import { useApiResource } from "../lib/useApiResource";
import { useEditorConfig } from "../lib/useEditorConfig";
import { VCD_VALVES } from "../lib/constraints";
import type { LayerPreset, Material } from "../types/api";
import {
  INITIAL_PRESET_FILTERS,
  PresetFilters,
  matchesPresetFilters,
  type PresetFilterState,
} from "../features/layer-presets/PresetFilters";
import { PresetBrowseCard } from "../features/layer-presets/PresetBrowseCard";
import { PresetDetailView } from "../features/layer-presets/PresetDetailView";
import { PresetWorkspace } from "../features/layer-presets/PresetWorkspace";
import "../features/library/library.css";
import "../features/layer-presets/layer-presets.css";

type View =
  | { mode: "browse" }
  | { mode: "detail"; presetId: number }
  | { mode: "create" }
  | { mode: "edit"; presetId: number };

function sortedPresets(rows: LayerPreset[]): LayerPreset[] {
  return [...rows].sort((left, right) => `${left.scope}:${left.name}`.localeCompare(`${right.scope}:${right.name}`));
}

/**
 * Layer preset library in the card-library layout: browsing, details,
 * creation, and editing are distinct in-page states opened by explicit
 * actions, with search/filter context preserved across the transitions.
 */
export function LayerPresetsPage() {
  const { user } = useSession();
  const { show } = useToast();
  const canCreateShared = user?.role === "instructor" || user?.role === "administrator";
  const canManageShared = canCreateShared;
  const loadPresets = useCallback(() => apiFetch<LayerPreset[]>("/api/layer-presets?include_inactive=true"), []);
  const resource = useApiResource(loadPresets);
  const loadMaterials = useCallback(() => apiFetch<Material[]>("/api/materials"), []);
  const materialsResource = useApiResource(loadMaterials);
  const materials = materialsResource.data ?? [];
  const editorConfigResource = useEditorConfig();
  const vcdValves = editorConfigResource.data?.vcd_valves ?? VCD_VALVES;
  const loadPromotable = useCallback(
    () => (canCreateShared ? apiFetch<LayerPreset[]>("/api/layer-presets?promotable=true") : Promise.resolve([])),
    [canCreateShared],
  );
  const promotableResource = useApiResource(loadPromotable);
  const [promotedIds, setPromotedIds] = useState<number[]>([]);
  const promotableRowsRaw = (promotableResource.data ?? []).filter((row) => !promotedIds.includes(row.id));
  // The promotable list is a staff-only side list: never block the page on
  // it, but its failure must be visible instead of silently dropping the
  // promotion section.
  const promotableError = canCreateShared && promotableResource.status === "error"
    ? `Unable to load student presets for promotion: ${promotableResource.error ?? "unknown error"}`
    : null;

  const [presets, setPresets] = useState<LayerPreset[] | null>(null);
  const rows = useMemo(() => sortedPresets(presets ?? resource.data ?? []), [presets, resource.data]);
  // Promotion candidates must never duplicate a record the regular catalog
  // already shows (the backend scopes the list to other users' presets, but
  // a stale or unexpected payload must not render the same preset twice).
  const promotableRows = useMemo(
    () => promotableRowsRaw.filter((row) => !rows.some((visible) => visible.id === row.id)),
    [promotableRowsRaw, rows],
  );
  const [filters, setFilters] = useState<PresetFilterState>(INITIAL_PRESET_FILTERS);
  const filteredRows = useMemo(
    () => rows.filter((preset) => matchesPresetFilters(preset, filters)),
    [rows, filters],
  );
  // The copy workspace and the filter options work on the complete visible
  // catalog: list filters narrow the results, never the copy source and
  // never the candidate options themselves.
  const allActiveRows = useMemo(() => rows.filter((preset) => preset.status === "active"), [rows]);

  const [view, setView] = useState<View>({ mode: "browse" });
  const [promotingPreset, setPromotingPreset] = useState<LayerPreset | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  function replacePreset(replacement: LayerPreset) {
    setPresets((current) => sortedPresets((current ?? rows).some((row) => row.id === replacement.id)
      ? (current ?? rows).map((row) => row.id === replacement.id ? replacement : row)
      : [...(current ?? rows), replacement]));
  }

  async function promoteSelected() {
    if (!promotingPreset) return;
    const target = promotingPreset;
    setPromotingPreset(null);
    setPromoteError(null);
    try {
      const updated = await apiFetch<LayerPreset>(`/api/layer-presets/${target.id}/promote`, { method: "POST" });
      setPromotedIds((current) => [...current, updated.id]);
      replacePreset(updated);
      show(`${updated.name} is now shared with every student.`, "success");
    } catch (caught) {
      setPromoteError(caught instanceof Error ? caught.message : "Unable to promote the layer preset.");
    }
  }

  if (resource.status === "loading" && resource.data === null) {
    return <div className="page-loading" role="status">Loading layer presets…</div>;
  }
  if (resource.status === "error" && resource.data === null) {
    return <ErrorState message={resource.error ?? "Unable to load layer presets."} action={
      <button type="button" className="button button--secondary" onClick={() => void resource.reload()}>Retry</button>
    } />;
  }

  function renderBrowse() {
    const groups: { key: string; title: string; rows: LayerPreset[]; promoteOnly?: boolean }[] = [
      { key: "shared", title: "Shared presets", rows: filteredRows.filter((preset) => preset.scope === "shared") },
      { key: "personal", title: "My presets", rows: filteredRows.filter((preset) => preset.scope === "personal") },
    ];
    if (canCreateShared && promotableRows.length > 0) {
      groups.push({
        key: "promotable",
        title: "Student personal presets — promote to shared",
        rows: promotableRows.filter((preset) => matchesPresetFilters(preset, filters)),
        promoteOnly: true,
      });
    }
    return (
      <>
        {promotableError ? (
          <div className="inline-form-error" role="alert">{promotableError}</div>
        ) : null}
        {promoteError ? (
          <InlineFormError message={promoteError} />
        ) : null}
        <PresetFilters
          filters={filters}
          catalogRows={rows}
          rows={filteredRows}
          totalCount={rows.length}
          onChange={setFilters}
          onClear={() => setFilters(INITIAL_PRESET_FILTERS)}
        />
        {groups.map((group) => (
          <section className="catalog-group" key={group.key} aria-labelledby={`preset-group-${group.key}`}>
            <div className="catalog-group__heading">
              <h2 id={`preset-group-${group.key}`}>{group.title}</h2>
              <span className="record-count">{group.rows.length} records</span>
            </div>
            {group.rows.length === 0 ? (
              <EmptyState title={`No ${group.title.toLowerCase()} match the current view.`} />
            ) : (
              <div className="lib-grid">
                {group.rows.map((preset) => (
                  <PresetBrowseCard
                    key={preset.id}
                    preset={preset}
                    vcdValves={vcdValves}
                    canEdit={group.promoteOnly
                      ? false
                      : preset.scope === "personal" || canManageShared}
                    promoteOnly={group.promoteOnly}
                    onOpenDetails={(presetId) => setView({ mode: "detail", presetId })}
                    onEdit={(presetId) => setView({ mode: "edit", presetId })}
                    onPromote={group.promoteOnly ? setPromotingPreset : undefined}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
        <ConfirmDialog
          open={promotingPreset !== null}
          title="Promote layer preset to shared"
          message={`Every student will be able to select ${promotingPreset?.name ?? "this preset"} as a starting point. Promotion is one-way: the preset cannot be made personal again.`}
          confirmLabel="Promote to shared"
          onConfirm={() => void promoteSelected()}
          onCancel={() => setPromotingPreset(null)}
        />
      </>
    );
  }

  function renderDetail() {
    if (view.mode !== "detail") return null;
    // Detail can be opened from the browse catalog or from the staff-only
    // promotion review list; the two have different authorized actions.
    const ownRow = rows.find((row) => row.id === view.presetId);
    const promotableRow = ownRow ? undefined : promotableRows.find((row) => row.id === view.presetId);
    const preset = ownRow ?? promotableRow;
    if (!preset) {
      return <ErrorState message="This preset is no longer in the visible library." action={
        <button type="button" className="button button--secondary" onClick={() => setView({ mode: "browse" })}>Back to library</button>
      } />;
    }
    if (promotableRow) {
      return (
        <PresetDetailView
          preset={preset}
          vcdValves={vcdValves}
          variant="promotable"
          canEdit={false}
          canDeactivate={false}
          canPromote={canCreateShared}
          onChanged={(updated) => {
            // Promotion succeeded: the preset becomes a shared record in the
            // regular catalog and the detail switches to the standard view.
            setPromotedIds((current) => [...current, updated.id]);
            replacePreset(updated);
          }}
          onEdit={(presetId) => setView({ mode: "edit", presetId })}
          onBack={() => setView({ mode: "browse" })}
        />
      );
    }
    return (
      <PresetDetailView
        preset={preset}
        vcdValves={vcdValves}
        variant="standard"
        canEdit={preset.scope === "personal" || canManageShared}
        canDeactivate={preset.scope === "personal" || canManageShared}
        canPromote={canCreateShared && preset.scope === "personal"}
        onChanged={(updated) => {
          replacePreset(updated);
          if (updated.scope === "shared") {
            setPromotedIds((current) => [...current, updated.id]);
          }
        }}
        onEdit={(presetId) => setView({ mode: "edit", presetId })}
        onBack={() => setView({ mode: "browse" })}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Layer presets"
        description="Reusable single-layer input templates. Selecting a preset copies its complete values into an editable experiment configuration."
        actions={view.mode === "browse" ? (
          <button type="button" className="button button--primary" onClick={() => setView({ mode: "create" })}>
            New preset
          </button>
        ) : undefined}
      />
      {view.mode === "browse" ? renderBrowse() : null}
      {view.mode === "detail" ? renderDetail() : null}
      {view.mode === "create" ? (
        <PresetWorkspace
          mode={{ kind: "create" }}
          activeRows={allActiveRows}
          materials={materials}
          vcdValves={vcdValves}
          canCreateShared={canCreateShared}
          onSaved={(created) => {
            replacePreset(created);
            setView({ mode: "detail", presetId: created.id });
          }}
          onCancel={() => setView({ mode: "browse" })}
        />
      ) : null}
      {view.mode === "edit" ? (
        rows.some((row) => row.id === view.presetId) ? (
          <PresetWorkspace
            mode={{ kind: "revise", preset: rows.find((row) => row.id === view.presetId)! }}
            activeRows={allActiveRows}
            materials={materials}
            vcdValves={vcdValves}
            canCreateShared={canCreateShared}
            onSaved={(updated) => {
              replacePreset(updated);
              setView({ mode: "detail", presetId: updated.id });
            }}
            onCancel={() => setView({ mode: "browse" })}
          />
        ) : (
          <ErrorState message="This preset is no longer in the visible library." action={
            <button type="button" className="button button--secondary" onClick={() => setView({ mode: "browse" })}>Back to library</button>
          } />
        )
      ) : null}
    </>
  );
}
