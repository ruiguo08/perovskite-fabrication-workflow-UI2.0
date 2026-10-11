import { useState, type FormEvent } from "react";
import { useSession } from "../../auth/session";
import { FormField } from "../../components/FormField";
import { InlineFormError } from "../../components/InlineFormError";
import { useToast } from "../../components/Toast";
import { apiFetch } from "../../lib/api";
import type { Material } from "../../types/api";
import { LibFacts, LibSection, LibTag, LibTags } from "../library/LibraryPrimitives";
import { SpecificationEditor } from "../library/SpecificationEditor";
import { materialCategoryLabel } from "./materialSummary";

const CATEGORIES = ["substrate", "chemical", "solvent", "gas", "other"] as const;
const STATUSES = ["pending", "active", "inactive"] as const;

export type MaterialWorkspaceMode =
  | { kind: "create" }
  | { kind: "revise"; material: Material };

/**
 * Creation and edit workspace for materials, opened from the browse view by
 * an explicit action. Grouped identity / specification / supplier sections
 * with a live card preview beside the form (below it on narrow screens).
 * Students keep the existing submit-for-review behavior; staff keep their
 * exact authority.
 */
export function MaterialWorkspace({
  mode,
  onSaved,
  onCancel,
}: {
  mode: MaterialWorkspaceMode;
  onSaved: (material: Material) => void;
  onCancel: () => void;
}) {
  const { show } = useToast();
  const { user } = useSession();
  const canManage = user?.role === "instructor" || user?.role === "administrator";
  const existing = mode.kind === "revise" ? mode.material : null;
  const [category, setCategory] = useState(existing?.category ?? "substrate");
  const [name, setName] = useState(existing?.name ?? "");
  const [formula, setFormula] = useState(existing?.formula ?? "");
  const [casNumber, setCasNumber] = useState(existing?.cas_number ?? "");
  const [status, setStatus] = useState(existing?.status ?? "pending");
  const [specification, setSpecification] = useState<Record<string, unknown>>(
    existing ? { ...existing.specification } : {},
  );
  const [specificationValid, setSpecificationValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!specificationValid) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const saved = existing
        ? await apiFetch<Material>(`/api/materials/${existing.id}`, {
            method: "PATCH",
            body: {
              name: name.trim(),
              formula: formula.trim(),
              cas_number: casNumber.trim(),
              specification,
              status,
            },
          })
        : await apiFetch<Material>("/api/materials", {
            method: "POST",
            body: {
              category,
              name: name.trim(),
              formula: formula.trim(),
              cas_number: casNumber.trim(),
              specification,
            },
          });
      onSaved(saved);
      show(existing
        ? "Material updated."
        : canManage
          ? "Material added to the active directory."
          : "Material submitted for review.", "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the material.");
    } finally {
      setSubmitting(false);
    }
  }

  // The preview reflects exactly the current inputs without inventing values.
  // New records preview their post-save state: staff creations land active,
  // student submissions stay pending until reviewed.
  const previewMaterial: Material = {
    id: existing?.id ?? 0,
    category,
    name: name.trim() || "Unnamed material",
    formula,
    cas_number: casNumber,
    specification,
    status: existing ? status : canManage ? "active" : "pending",
    products: existing?.products ?? [],
    created_at: existing?.created_at ?? new Date().toISOString(),
    updated_at: existing?.updated_at ?? new Date().toISOString(),
  };

  return (
    <section className="lib-editor" aria-labelledby="material-workspace-title">
      <h2 className="lib-editor__title" id="material-workspace-title">
        {existing ? `Edit ${existing.name}` : "New material"}
      </h2>
      <p className="lib-editor__subtitle">
        {existing
          ? `Category ${materialCategoryLabel(existing.category)} is fixed for an existing record. Saving updates this record in place.`
          : "Students submit materials for review; instructors and administrators add them to the active directory directly."}
      </p>
      <form onSubmit={(event) => void save(event)}>
        <div className="lib-editor-grid">
          <div className="lib-editor__form">
            <LibSection title="Identity" labelledBy="material-workspace-identity">
              <div className="builder-fields builder-fields--two">
                {existing ? (
                  <div className="form-field">
                    <span className="form-field__label">Category</span>
                    <input className="text-input" value={materialCategoryLabel(existing.category)} readOnly aria-label="Material category (fixed)" />
                  </div>
                ) : (
                  <FormField label="Material category" htmlFor="material-category" required>
                    <select id="material-category" className="text-input" required value={category} onChange={(event) => setCategory(event.target.value as (typeof CATEGORIES)[number])}>
                      {CATEGORIES.map((value) => <option key={value} value={value}>{materialCategoryLabel(value)}</option>)}
                    </select>
                  </FormField>
                )}
                <FormField label="Material name" htmlFor="material-name" required>
                  <input id="material-name" className="text-input" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} />
                </FormField>
                <FormField label="Formula" htmlFor="material-formula">
                  <input id="material-formula" className="text-input mono" maxLength={120} value={formula} onChange={(event) => setFormula(event.target.value)} />
                </FormField>
                <FormField label="CAS number" htmlFor="material-cas">
                  <input id="material-cas" className="text-input mono" maxLength={64} value={casNumber} onChange={(event) => setCasNumber(event.target.value)} />
                </FormField>
                {existing ? (
                  <FormField label="Record status" htmlFor="material-status" required>
                    <select id="material-status" className="text-input" value={status} onChange={(event) => setStatus(event.target.value)}>
                      {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </FormField>
                ) : null}
              </div>
            </LibSection>

            <LibSection
              title="Specification"
              labelledBy="material-workspace-specification"
              hint="Ordinary values use key/value rows. Lists and nested objects stay untouched in the record and are edited through the advanced editor — nothing is flattened or dropped."
            >
              <SpecificationEditor
                idPrefix="material-spec"
                specification={specification}
                onChange={setSpecification}
                onValidityChange={setSpecificationValid}
              />
            </LibSection>

            {existing ? (
              <LibSection
                title="Supplier products"
                labelledBy="material-workspace-products"
                hint="Supplier products are managed on the material's detail page, inside the parent material context."
              >
                <p className="lib-muted">
                  {existing.products.length} supplier product{existing.products.length === 1 ? "" : "s"} recorded. Open the detail view to add or edit products.
                </p>
              </LibSection>
            ) : (
              <LibSection title="Supplier products" labelledBy="material-workspace-products">
                <p className="lib-muted">Save the material first — supplier products are added to an existing record from its detail page.</p>
              </LibSection>
            )}
          </div>

          <aside className="lib-preview" aria-label="Card preview">
            <h3>Card preview</h3>
            <div className="lib-record">
              <LibTags>
                <LibTag tone="info">{materialCategoryLabel(previewMaterial.category)}</LibTag>
                <LibTag tone={previewMaterial.status === "pending" ? "warn" : undefined}>{previewMaterial.status}</LibTag>
              </LibTags>
              <div className="lib-record__head">
                <div>
                  <h3 className="lib-record__title">{previewMaterial.name}</h3>
                  <p className="lib-record__subtitle">
                    {previewMaterial.formula.trim() ? previewMaterial.formula.trim() : "No formula recorded"}
                    {previewMaterial.cas_number.trim() ? ` · CAS ${previewMaterial.cas_number.trim()}` : ""}
                  </p>
                </div>
              </div>
              <LibFacts facts={Object.entries(previewMaterial.specification)
                .filter(([, value]) => value !== null && value !== undefined && !(typeof value === "string" && value.trim() === ""))
                .slice(0, 4)
                .map(([key, value]) => ({
                  label: key,
                  value: typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : JSON.stringify(value),
                }))} />
            </div>
          </aside>
        </div>

        <InlineFormError message={error} />
        <div className="lib-savebar">
          <div className="lib-savebar__actions">
            <button className="button button--primary" type="submit" disabled={submitting || !specificationValid}>
              {submitting
                ? "Saving…"
                : existing
                  ? "Save material"
                  : canManage
                    ? "Add active material"
                    : "Submit material for review"}
            </button>
            <button className="button button--secondary" type="button" onClick={onCancel}>Cancel</button>
          </div>
          <span className="lib-muted">Cancel discards the entered values without sending any request.</span>
        </div>
      </form>
    </section>
  );
}
