import { useState, type FormEvent } from "react";
import { FormField } from "../../components/FormField";
import { InlineFormError } from "../../components/InlineFormError";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../components/Toast";
import { apiFetch } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { Material, MaterialProduct } from "../../types/api";
import { LibFacts, LibSection, LibTag, LibTags } from "../library/LibraryPrimitives";
import { SpecificationEditor } from "../library/SpecificationEditor";
import {
  formatSpecificationValue,
  materialCategoryLabel,
  productSummary,
  titleMaterialSpec,
} from "./materialSummary";

/**
 * Detail surface for one material: identity and full specifications first,
 * supplier products as an internal subdirectory (with their own states),
 * role-appropriate actions, and collapsed raw technical data. Material and
 * product states stay visibly distinct.
 */
export function MaterialDetailView({
  material,
  canManage,
  onChanged,
  onEdit,
  onBack,
}: {
  material: Material;
  canManage: boolean;
  onChanged: (material: Material) => void;
  onEdit: (materialId: number) => void;
  onBack: () => void;
}) {
  const titleId = `material-detail-title-${material.id}`;
  const scalarEntries = Object.entries(material.specification);
  const complexEntries = scalarEntries.filter(([, value]) => value !== null && typeof value === "object");
  const scalarFacts = scalarEntries
    .filter(([, value]) => value === null || typeof value !== "object")
    .map(([key, value]) => ({ label: titleMaterialSpec(key), value: formatSpecificationValue(value) }));

  return (
    <article aria-labelledby={titleId}>
      <button type="button" className="button button--secondary lib-back" onClick={onBack}>
        ← Back to directory
      </button>
      <div className="lib-detail">
        <header className="lib-detail__head">
          <div>
            <h2 className="lib-detail__title" id={titleId}>{material.name}</h2>
            <LibTags>
              <LibTag tone="info">{materialCategoryLabel(material.category)}</LibTag>
              {material.formula.trim() ? <LibTag>{material.formula.trim()}</LibTag> : null}
              {material.cas_number.trim() ? <LibTag>CAS {material.cas_number.trim()}</LibTag> : null}
            </LibTags>
          </div>
          <div className="lib-actions">
            <StatusBadge status={material.status} />
            {canManage ? (
              <button type="button" className="button button--primary" onClick={() => onEdit(material.id)}>Edit material</button>
            ) : null}
          </div>
        </header>

        <LibSection title="Identity" labelledBy={`material-detail-identity-${material.id}`}>
          <LibFacts singleColumn facts={[
            { label: "Name", value: material.name },
            { label: "Category", value: materialCategoryLabel(material.category) },
            { label: "Formula", value: material.formula.trim() || "Not recorded" },
            { label: "CAS number", value: material.cas_number.trim() || "Not recorded" },
            { label: "Record status", value: material.status },
            { label: "Updated", value: formatDateTime(material.updated_at) },
          ]} />
        </LibSection>

        <LibSection
          title="Specification"
          labelledBy={`material-detail-specification-${material.id}`}
          hint="Values recorded for this material. Missing optional values are not inferred."
        >
          {scalarFacts.length > 0 ? <LibFacts facts={scalarFacts} /> : <p className="lib-muted">No scalar specification values recorded.</p>}
          {complexEntries.length > 0 ? (
            <dl className="lib-facts lib-facts--single">
              {complexEntries.map(([key, value]) => (
                <div key={key}>
                  <dt>{titleMaterialSpec(key)}</dt>
                  <dd><pre className="snapshot-json">{JSON.stringify(value, null, 2)}</pre></dd>
                </div>
              ))}
            </dl>
          ) : null}
          <details className="lib-provenance">
            <summary>Raw specification (JSON)</summary>
            <pre className="snapshot-json">{JSON.stringify(material.specification, null, 2)}</pre>
          </details>
        </LibSection>

        <SupplierProductsSection material={material} canManage={canManage} onChanged={onChanged} />
      </div>
    </article>
  );
}

function SupplierProductsSection({
  material,
  canManage,
  onChanged,
}: {
  material: Material;
  canManage: boolean;
  onChanged: (material: Material) => void;
}) {
  const { show } = useToast();
  const [vendor, setVendor] = useState("");
  const [catalogNumber, setCatalogNumber] = useState("");
  const [specification, setSpecification] = useState<Record<string, unknown>>({});
  const [specificationValid, setSpecificationValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!specificationValid) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await apiFetch<Material>(`/api/materials/${material.id}/products`, {
        method: "POST",
        body: {
          vendor: vendor.trim(),
          catalog_number: catalogNumber.trim(),
          specification,
        },
      });
      onChanged(updated);
      setVendor("");
      setCatalogNumber("");
      setSpecification({});
      setSpecificationValid(true);
      show(canManage ? "Supplier product added." : "Supplier product submitted for review.", "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the supplier product.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LibSection
      title="Supplier products"
      labelledBy={`material-detail-products-${material.id}`}
      hint="Each product keeps its own vendor, catalog number, review status, and specification — independent of the material record's status."
    >
      {material.products.length === 0 ? (
        <p className="lib-muted">No supplier products have been recorded.</p>
      ) : (
        material.products.map((product) => (
          <ProductRow key={product.id} material={material} product={product} canManage={canManage} onChanged={onChanged} />
        ))
      )}
      <details className="inline-editor inline-editor--product">
        <summary>{canManage ? "Add supplier product" : "Propose supplier product"}</summary>
        <form className="inline-editor__body" onSubmit={(event) => void createProduct(event)}>
          <div className="product-create-grid">
            <FormField label={`New vendor for ${material.name}`} htmlFor={`new-product-vendor-${material.id}`} required>
              <input id={`new-product-vendor-${material.id}`} className="text-input" required maxLength={160} value={vendor} onChange={(event) => setVendor(event.target.value)} />
            </FormField>
            <FormField label={`New catalog number for ${material.name}`} htmlFor={`new-product-code-${material.id}`} required>
              <input id={`new-product-code-${material.id}`} className="text-input mono" required maxLength={160} value={catalogNumber} onChange={(event) => setCatalogNumber(event.target.value)} />
            </FormField>
          </div>
          <SpecificationEditor
            idPrefix={`new-product-spec-${material.id}`}
            specification={specification}
            onChange={setSpecification}
            onValidityChange={setSpecificationValid}
          />
          <InlineFormError message={error} />
          <button className="button button--secondary" type="submit" disabled={submitting || !specificationValid}>
            {canManage ? "Add product" : "Submit product for review"}
          </button>
        </form>
      </details>
    </LibSection>
  );
}

function ProductRow({
  material,
  product,
  canManage,
  onChanged,
}: {
  material: Material;
  product: MaterialProduct;
  canManage: boolean;
  onChanged: (material: Material) => void;
}) {
  const { show } = useToast();
  const [vendor, setVendor] = useState(product.vendor);
  const [catalogNumber, setCatalogNumber] = useState(product.catalog_number);
  const [status, setStatus] = useState(product.status);
  const [specification, setSpecification] = useState(product.specification);
  const [specificationValid, setSpecificationValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function updateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!specificationValid) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await apiFetch<Material>(`/api/material-products/${product.id}`, {
        method: "PATCH",
        body: {
          vendor: vendor.trim(),
          catalog_number: catalogNumber.trim(),
          specification,
          status,
        },
      });
      onChanged(updated);
      show("Supplier product updated.", "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update the supplier product.");
    } finally {
      setSubmitting(false);
    }
  }

  const summaryFacts = productSummary(product);
  if (!canManage) {
    return (
      <div className="lib-product">
        <div className="lib-product__head">
          <span><strong>{product.vendor}</strong> · {product.catalog_number}</span>
          <StatusBadge status={product.status} />
        </div>
        {summaryFacts.length > 0 ? <LibFacts facts={summaryFacts} /> : null}
      </div>
    );
  }

  return (
    <div className="lib-product">
      <div className="lib-product__head">
        <span><strong>{product.vendor}</strong> · {product.catalog_number}</span>
        <StatusBadge status={product.status} />
      </div>
      {summaryFacts.length > 0 ? <LibFacts facts={summaryFacts} /> : null}
      <details className="inline-editor">
        <summary>Edit product</summary>
        <form className="inline-editor__body" onSubmit={(event) => void updateProduct(event)}>
          <div className="product-create-grid">
            <FormField label={`Vendor for ${product.catalog_number}`} htmlFor={`product-vendor-${product.id}`} required>
              <input id={`product-vendor-${product.id}`} className="text-input" required maxLength={160} value={vendor} onChange={(event) => setVendor(event.target.value)} />
            </FormField>
            <FormField label={`Catalog number for ${material.name} product ${product.id}`} htmlFor={`product-code-${product.id}`} required>
              <input id={`product-code-${product.id}`} className="text-input mono" required maxLength={160} value={catalogNumber} onChange={(event) => setCatalogNumber(event.target.value)} />
            </FormField>
            <FormField label={`Status for ${product.vendor} ${product.catalog_number}`} htmlFor={`product-status-${product.id}`} required>
              <select id={`product-status-${product.id}`} className="text-input" value={status} onChange={(event) => setStatus(event.target.value)}>
                {["pending", "active", "inactive"].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </FormField>
          </div>
          <SpecificationEditor
            idPrefix={`product-spec-${product.id}`}
            specification={specification}
            onChange={setSpecification}
            onValidityChange={setSpecificationValid}
          />
          <InlineFormError message={error} />
          <button className="button button--secondary" type="submit" disabled={submitting || !specificationValid}>Save product</button>
        </form>
      </details>
    </div>
  );
}
