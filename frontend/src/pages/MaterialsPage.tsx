import { useCallback, useMemo, useState } from "react";
import { useSession } from "../auth/session";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FormField } from "../components/FormField";
import { PageHeader } from "../components/PageHeader";
import { apiFetch } from "../lib/api";
import { useApiResource } from "../lib/useApiResource";
import type { Material } from "../types/api";
import { MaterialBrowseCard } from "../features/materials/MaterialBrowseCard";
import { MaterialDetailView } from "../features/materials/MaterialDetailView";
import { MaterialWorkspace } from "../features/materials/MaterialWorkspace";
import "../features/library/library.css";

const CATEGORY_LABELS: Record<string, string> = {
  substrate: "Substrates",
  chemical: "Chemicals and reagents",
  solvent: "Solvents",
  gas: "Gases",
  other: "Other materials",
};

type View =
  | { mode: "browse" }
  | { mode: "detail"; materialId: number }
  | { mode: "create" }
  | { mode: "edit"; materialId: number };

interface MaterialFilters {
  query: string;
  category: string;
  status: string;
}

const INITIAL_FILTERS: MaterialFilters = { query: "", category: "all", status: "all" };

function matchesFilters(material: Material, filters: MaterialFilters): boolean {
  const query = filters.query.trim().toLowerCase();
  if (query
    && !material.name.toLowerCase().includes(query)
    && !material.formula.toLowerCase().includes(query)
    && !material.cas_number.toLowerCase().includes(query)
    && !JSON.stringify(material.specification).toLowerCase().includes(query)) {
    return false;
  }
  if (filters.category !== "all" && material.category !== filters.category) {
    return false;
  }
  if (filters.status !== "all" && material.status !== filters.status) {
    return false;
  }
  return true;
}

function upsertMaterial(rows: Material[], replacement: Material): Material[] {
  const existing = rows.some((row) => row.id === replacement.id);
  const next = existing
    ? rows.map((row) => (row.id === replacement.id ? replacement : row))
    : [...rows, replacement];
  return next.sort((left, right) =>
    `${left.category}:${left.name}`.localeCompare(`${right.category}:${right.name}`),
  );
}

/**
 * Material directory in the card-library layout: browsing, details, creation,
 * and editing are distinct in-page states opened by explicit actions, with
 * search/filter context preserved across the transitions.
 */
export function MaterialsPage() {
  const { user } = useSession();
  const canManage = user?.role === "instructor" || user?.role === "administrator";
  const loadMaterials = useCallback(() => apiFetch<Material[]>("/api/materials"), []);
  const resource = useApiResource(loadMaterials);

  const [materials, setMaterials] = useState<Material[] | null>(null);
  const rows = useMemo(() => materials ?? resource.data ?? [], [materials, resource.data]);
  const [filters, setFilters] = useState<MaterialFilters>(INITIAL_FILTERS);
  const filteredRows = useMemo(
    () => rows.filter((material) => matchesFilters(material, filters)),
    [rows, filters],
  );
  const [view, setView] = useState<View>({ mode: "browse" });

  function replaceMaterial(replacement: Material) {
    setMaterials((current) => upsertMaterial(current ?? rows, replacement));
  }

  if (resource.status === "loading" && resource.data === null) {
    return <div className="page-loading" role="status">Loading materials…</div>;
  }
  if (resource.status === "error" && resource.data === null) {
    return <ErrorState message={resource.error ?? "Unable to load materials."} action={
      <button type="button" className="button button--secondary" onClick={() => void resource.reload()}>Retry</button>
    } />;
  }

  // Filter options come from the complete authorized catalog and never
  // collapse with the result set.
  const categories = [...new Set(rows.map((material) => material.category))].sort();
  const statuses = [...new Set(rows.map((material) => material.status))].sort();
  const hasActiveFilters = filters.query.trim() !== "" || filters.category !== "all" || filters.status !== "all";

  function renderBrowse() {
    return (
      <>
        <section className="panel experiment-filters" aria-label="Material filters">
          <FormField label="Search materials" htmlFor="material-filter-search">
            <input
              id="material-filter-search"
              className="text-input"
              type="search"
              value={filters.query}
              onChange={(event) => setFilters({ ...filters, query: event.target.value })}
              placeholder="Name, formula, CAS, or specification"
            />
          </FormField>
          <FormField label="Category" htmlFor="material-filter-category">
            <select
              id="material-filter-category"
              className="text-input"
              value={filters.category}
              onChange={(event) => setFilters({ ...filters, category: event.target.value })}
            >
              <option value="all">All categories</option>
              {categories.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value] ?? value}</option>)}
            </select>
          </FormField>
          <FormField label="Status" htmlFor="material-filter-status">
            <select
              id="material-filter-status"
              className="text-input"
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            >
              <option value="all">All statuses</option>
              {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </FormField>
          <span className="record-count experiment-filters__count">{filteredRows.length} of {rows.length} records</span>
          {hasActiveFilters ? (
            <button type="button" className="button button--secondary button--small" onClick={() => setFilters(INITIAL_FILTERS)}>
              Clear filters
            </button>
          ) : null}
        </section>
        {rows.length === 0 ? (
          <EmptyState
            title="No materials have been recorded."
            description="Add the first reusable material to start the directory."
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState title="No materials match the current filters." />
        ) : (
          <div className="lib-grid">
            {filteredRows.map((material) => (
              <MaterialBrowseCard
                key={material.id}
                material={material}
                canManage={canManage}
                onOpenDetails={(materialId) => setView({ mode: "detail", materialId })}
                onEdit={(materialId) => setView({ mode: "edit", materialId })}
              />
            ))}
          </div>
        )}
      </>
    );
  }

  function renderDetail() {
    if (view.mode !== "detail") return null;
    const material = rows.find((row) => row.id === view.materialId);
    if (!material) {
      return <ErrorState message="This material is no longer in the visible directory." action={
        <button type="button" className="button button--secondary" onClick={() => setView({ mode: "browse" })}>Back to directory</button>
      } />;
    }
    return (
      <MaterialDetailView
        material={material}
        canManage={canManage}
        onChanged={replaceMaterial}
        onEdit={(materialId) => setView({ mode: "edit", materialId })}
        onBack={() => setView({ mode: "browse" })}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Material directory"
        description="Reusable materials and supplier products for experiment planning. Student submissions remain pending until reviewed."
        actions={view.mode === "browse" ? (
          <button type="button" className="button button--primary" onClick={() => setView({ mode: "create" })}>
            New material
          </button>
        ) : undefined}
      />
      {view.mode === "browse" ? renderBrowse() : null}
      {view.mode === "detail" ? renderDetail() : null}
      {view.mode === "create" ? (
        <MaterialWorkspace
          mode={{ kind: "create" }}
          onSaved={(created) => {
            replaceMaterial(created);
            setView({ mode: "detail", materialId: created.id });
          }}
          onCancel={() => setView({ mode: "browse" })}
        />
      ) : null}
      {view.mode === "edit" ? (
        rows.some((row) => row.id === view.materialId) ? (
          <MaterialWorkspace
            mode={{ kind: "revise", material: rows.find((row) => row.id === view.materialId)! }}
            onSaved={(updated) => {
              replaceMaterial(updated);
              setView({ mode: "detail", materialId: updated.id });
            }}
            onCancel={() => setView({ mode: "browse" })}
          />
        ) : (
          <ErrorState message="This material is no longer in the visible directory." action={
            <button type="button" className="button button--secondary" onClick={() => setView({ mode: "browse" })}>Back to directory</button>
          } />
        )
      ) : null}
    </>
  );
}
