import { localizeAppText, enumLabel } from "../../i18n";
import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
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
  useUiLanguage();
  const titleId = `material-detail-title-${material.id}`;
  const scalarEntries = Object.entries(material.specification);
  const complexEntries = scalarEntries.filter(([, value]) => value !== null && typeof value === "object");
  const scalarFacts = scalarEntries
    .filter(([, value]) => value === null || typeof value !== "object")
    .map(([key, value]) => ({ label: titleMaterialSpec(key), value: formatSpecificationValue(value) }));

  return (
    <article aria-labelledby={titleId}>
      <button type="button" className="button button--secondary lib-back" onClick={onBack}>
        {tr("materialDetailView.backToDirectory")}</button>
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
            <StatusBadge status={material.status} context="catalog" />
            {canManage ? (
              <button type="button" className="button button--primary" onClick={() => onEdit(material.id)}>{tr("materialDetailView.editMaterial")}</button>
            ) : null}
          </div>
        </header>

        <LibSection title={tr("presetDiffViewer.identity")} labelledBy={`material-detail-identity-${material.id}`}>
          <LibFacts singleColumn facts={[
            { label: tr("materialDetailView.name"), value: material.name },
            { label: tr("runSheetTable.category"), value: materialCategoryLabel(material.category) },
            { label: tr("materialDetailView.formula"), value: material.formula.trim() || "Not recorded" },
            { label: tr("materialDetailView.casNumber"), value: material.cas_number.trim() || "Not recorded" },
            { label: tr("materialDetailView.recordStatus"), value: material.status },
            { label: tr("presetDetailView.updated"), value: formatDateTime(material.updated_at) },
          ]} />
        </LibSection>

        <LibSection
          title={tr("materialDetailView.specification")}
          labelledBy={`material-detail-specification-${material.id}`}
          hint={tr("materialDetailView.valuesRecordedForThisMaterialMissingOptionalValuesAre")}
        >
          {scalarFacts.length > 0 ? <LibFacts facts={scalarFacts} /> : <p className="lib-muted">{tr("materialDetailView.noScalarSpecificationValuesRecorded")}</p>}
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
            <summary>{tr("materialDetailView.rawSpecificationJSON")}</summary>
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
  useUiLanguage();
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
      title={tr("materialDetailView.supplierProducts")}
      labelledBy={`material-detail-products-${material.id}`}
      hint={tr("materialDetailView.eachProductKeepsItsOwnVendorCatalogNumberReview")}
    >
      {material.products.length === 0 ? (
        <p className="lib-muted">{tr("materialDetailView.noSupplierProductsHaveBeenRecorded")}</p>
      ) : (
        material.products.map((product) => (
          <ProductRow key={product.id} material={material} product={product} canManage={canManage} onChanged={onChanged} />
        ))
      )}
      <details className="inline-editor inline-editor--product">
        <summary>{canManage ? tr("materialDetailView.addSupplierProduct") : tr("materialDetailView.proposeSupplierProduct")}</summary>
        <form className="inline-editor__body" onSubmit={(event) => void createProduct(event)}>
          <div className="product-create-grid">
            <FormField label={tr("materialDetailView.newVendorForName", { "name": material.name })} htmlFor={`new-product-vendor-${material.id}`} required>
              <input id={`new-product-vendor-${material.id}`} className="text-input" required maxLength={160} value={vendor} onChange={(event) => setVendor(event.target.value)} />
            </FormField>
            <FormField label={tr("materialDetailView.newCatalogNumberForName", { "name": material.name })} htmlFor={`new-product-code-${material.id}`} required>
              <input id={`new-product-code-${material.id}`} className="text-input mono" required maxLength={160} value={catalogNumber} onChange={(event) => setCatalogNumber(event.target.value)} />
            </FormField>
          </div>
          <SpecificationEditor
            idPrefix={`new-product-spec-${material.id}`}
            specification={specification}
            onChange={setSpecification}
            onValidityChange={setSpecificationValid}
          />
          <InlineFormError message={localizeAppText(error ?? "")} />
          <button className="button button--secondary" type="submit" disabled={submitting || !specificationValid}>
            {canManage ? tr("materialDetailView.addProduct") : tr("materialDetailView.submitProductForReview")}
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
  useUiLanguage();
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
          <StatusBadge status={product.status} context="catalog" />
        </div>
        {summaryFacts.length > 0 ? <LibFacts facts={summaryFacts} /> : null}
      </div>
    );
  }

  return (
    <div className="lib-product">
      <div className="lib-product__head">
        <span><strong>{product.vendor}</strong> · {product.catalog_number}</span>
        <StatusBadge status={product.status} context="catalog" />
      </div>
      {summaryFacts.length > 0 ? <LibFacts facts={summaryFacts} /> : null}
      <details className="inline-editor">
        <summary>{tr("materialDetailView.editProduct")}</summary>
        <form className="inline-editor__body" onSubmit={(event) => void updateProduct(event)}>
          <div className="product-create-grid">
            <FormField label={tr("materialDetailView.vendorForCatalog", { "catalog": product.catalog_number })} htmlFor={`product-vendor-${product.id}`} required>
              <input id={`product-vendor-${product.id}`} className="text-input" required maxLength={160} value={vendor} onChange={(event) => setVendor(event.target.value)} />
            </FormField>
            <FormField label={tr("materialDetailView.catalogNumberForMaterialProductId", { "material": material.name, "id": product.id })} htmlFor={`product-code-${product.id}`} required>
              <input id={`product-code-${product.id}`} className="text-input mono" required maxLength={160} value={catalogNumber} onChange={(event) => setCatalogNumber(event.target.value)} />
            </FormField>
            <FormField label={tr("materialDetailView.statusForVendorCatalog", { "vendor": product.vendor, "catalog": product.catalog_number })} htmlFor={`product-status-${product.id}`} required>
              <select id={`product-status-${product.id}`} className="text-input" value={status} onChange={(event) => setStatus(event.target.value)}>
                {["pending", "active", "inactive"].map((value) => <option key={value} value={value}>{enumLabel(value, "catalog")}</option>)}
              </select>
            </FormField>
          </div>
          <SpecificationEditor
            idPrefix={`product-spec-${product.id}`}
            specification={specification}
            onChange={setSpecification}
            onValidityChange={setSpecificationValid}
          />
          <InlineFormError message={localizeAppText(error ?? "")} />
          <button className="button button--secondary" type="submit" disabled={submitting || !specificationValid}>{tr("materialDetailView.saveProduct")}</button>
        </form>
      </details>
    </div>
  );
}
