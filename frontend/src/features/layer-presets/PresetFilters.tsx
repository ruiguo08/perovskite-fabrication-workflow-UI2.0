import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import { FormField } from "../../components/FormField";
import type { LayerPreset } from "../../types/api";
import { layerMethodLabel, layerTypeLabel } from "./presetSummary";

export interface PresetFilterState {
  query: string;
  layerType: string;
  method: string;
  scope: string;
  status: string;
}

export const INITIAL_PRESET_FILTERS: PresetFilterState = {
  query: "",
  layerType: "all",
  method: "all",
  scope: "all",
  status: "all",
};

/**
 * The effective deposition method of a preset as a filter value: perovskite
 * presets always run spin coating + VCD; other layers may have no process yet.
 */
export function presetMethodValue(preset: LayerPreset): string {
  if (preset.layer.layer_type === "perovskite") {
    return "spin_coating_vcd";
  }
  return preset.layer.process?.method ?? "none";
}

/**
 * The searchable text of a preset: preset and layer names, the recorded
 * material names (solids, solvents, stock dispersion), and the process
 * labels the user sees in the interface. Hashes and internal keys are not
 * part of the search text.
 */
export function presetSearchText(preset: LayerPreset): string {
  const parts: string[] = [preset.name, preset.layer.name];
  const solution = preset.layer.solution;
  if (solution) {
    parts.push(solution.stock_dispersion);
    parts.push(...solution.solids.map((solid) => solid.chemical));
    parts.push(...solution.solvents.map((solvent) => solvent.solvent));
  }
  if (preset.layer.layer_type === "perovskite") {
    parts.push("spin coating + vcd");
  } else if (preset.layer.process) {
    parts.push(layerMethodLabel(preset.layer.process.method).toLowerCase());
  }
  return parts.join(" ").toLowerCase();
}

/**
 * Client-side filtering over the presets the list endpoint already scoped to
 * the current user — filtering never widens what a user can see.
 */
export function matchesPresetFilters(preset: LayerPreset, filters: PresetFilterState): boolean {
  const query = filters.query.trim().toLowerCase();
  if (query && !presetSearchText(preset).includes(query)) {
    return false;
  }
  if (filters.layerType !== "all" && preset.layer.layer_type !== filters.layerType) {
    return false;
  }
  if (filters.method !== "all" && presetMethodValue(preset) !== filters.method) {
    return false;
  }
  if (filters.scope !== "all" && preset.scope !== filters.scope) {
    return false;
  }
  if (filters.status !== "all" && preset.status !== filters.status) {
    return false;
  }
  return true;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

/**
 * Name search plus layer-type, method, scope, and status filters for the
 * preset library. Candidate options are derived from `catalogRows` — the
 * complete visible catalog — so narrowing the results never removes a filter
 * option the user needs to switch back; `rows` (the filtered results) feeds
 * only the result count.
 */
export function PresetFilters({
  filters,
  catalogRows,
  rows,
  totalCount,
  onChange,
  onClear,
}: {
  filters: PresetFilterState;
  catalogRows: LayerPreset[];
  rows: LayerPreset[];
  totalCount: number;
  onChange: (filters: PresetFilterState) => void;
  onClear: () => void;
}) {
  useUiLanguage();
  const layerTypes = uniqueSorted(catalogRows.map((preset) => preset.layer.layer_type));
  const methods = uniqueSorted(catalogRows.map((preset) => presetMethodValue(preset)));
  const hasActiveFilters = filters.query.trim() !== ""
    || filters.layerType !== "all"
    || filters.method !== "all"
    || filters.scope !== "all"
    || filters.status !== "all";
  return (
    <section className="panel experiment-filters" aria-label={tr("presetFilters.layerPresetFilters")}>
      <FormField label={tr("presetFilters.searchPresets")} htmlFor="preset-filter-search">
        <input
          id="preset-filter-search"
          className="text-input"
          type="search"
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          placeholder={tr("presetFilters.nameMaterialOrProcess")}
        />
      </FormField>
      <FormField label={tr("blankPresetForm.layerType")} htmlFor="preset-filter-layer-type">
        <select
          id="preset-filter-layer-type"
          className="text-input"
          value={filters.layerType}
          onChange={(event) => onChange({ ...filters, layerType: event.target.value })}
        >
          <option value="all">{tr("presetFilters.allLayerTypes")}</option>
          {layerTypes.map((layerType) => (
            <option key={layerType} value={layerType}>{layerTypeLabel(layerType)}</option>
          ))}
        </select>
      </FormField>
      <FormField label={tr("processEditor.method")} htmlFor="preset-filter-method">
        <select
          id="preset-filter-method"
          className="text-input"
          value={filters.method}
          onChange={(event) => onChange({ ...filters, method: event.target.value })}
        >
          <option value="all">{tr("presetFilters.allMethods")}</option>
          {methods.map((method) => (
            <option key={method} value={method}>
              {method === "spin_coating_vcd"
                ? tr("presetDetailView.spinCoatingVCD")
                : method === "none"
                  ? tr("presetFilters.noProcessRecorded")
                  : layerMethodLabel(method)}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label={tr("presetDetailView.scope")} htmlFor="preset-filter-scope">
        <select
          id="preset-filter-scope"
          className="text-input"
          value={filters.scope}
          onChange={(event) => onChange({ ...filters, scope: event.target.value })}
        >
          <option value="all">{tr("presetFilters.allScopes")}</option>
          <option value="shared">{tr("presetFilters.shared")}</option>
          <option value="personal">{tr("blankPresetForm.personal")}</option>
        </select>
      </FormField>
      <FormField label={tr("presetFilters.status")} htmlFor="preset-filter-status">
        <select
          id="preset-filter-status"
          className="text-input"
          value={filters.status}
          onChange={(event) => onChange({ ...filters, status: event.target.value })}
        >
          <option value="all">{tr("presetFilters.allStatuses")}</option>
          <option value="active">{tr("presetFilters.active")}</option>
          <option value="inactive">{tr("presetFilters.inactive")}</option>
        </select>
      </FormField>
      <span className="record-count experiment-filters__count">{rows.length} {tr("runSheetTable.of")}{totalCount} {tr("presetFilters.records")}</span>
      {hasActiveFilters ? (
        <button type="button" className="button button--secondary button--small" onClick={onClear}>
          {tr("presetFilters.clearFilters")}</button>
      ) : null}
    </section>
  );
}
