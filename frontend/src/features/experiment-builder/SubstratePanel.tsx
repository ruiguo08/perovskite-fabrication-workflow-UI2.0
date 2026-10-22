import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import { FormField } from "../../components/FormField";
import type { DeviceLayout, Material } from "../../types/api";
import type { ExperimentDraft } from "./types";

interface SubstratePanelProps {
  draft: ExperimentDraft;
  materials: Material[];
  layouts: DeviceLayout[];
  onChange: (draft: ExperimentDraft) => void;
  onLayoutChange: (layout: DeviceLayout) => void;
}

export function SubstratePanel({ draft, materials, layouts, onChange, onLayoutChange }: SubstratePanelProps) {
  useUiLanguage();
  // Students may use their own still-pending proposals: /api/materials already
  // scopes pending records to their submitter, so pending entries shown here
  // (and flagged in the label) are always the current user's own.
  const usable = (status: string) => status === "active" || status === "pending";
  const substrateMaterials = materials.filter((material) => usable(material.status) && material.category === "substrate");
  const selectedMaterial = substrateMaterials.find((material) => material.name === draft.substrate.material) ?? null;
  const products = selectedMaterial?.products.filter((product) => usable(product.status)) ?? [];
  const productValue = products.find((product) => product.vendor === draft.substrate.vendor && product.catalog_number === draft.substrate.type_number)?.id ?? "";
  const currentLayout = draft.conditions[0]?.device_layout_code ?? "";

  return (
    <section className="builder-panel" aria-labelledby="builder-substrate-title">
      <div className="builder-panel__heading"><div><span className="builder-panel__eyebrow">{tr("substratePanel.step")}</span><h2 id="builder-substrate-title">{tr("substratePanel.substrateAndDeviceLayout")}</h2></div></div>
      <p className="builder-help">{tr("substratePanel.supplierProductsComeFromTheReusableMaterialDirectoryA")}</p>
      <div className="builder-fields builder-fields--three">
        <FormField label={tr("substratePanel.substrateMaterial")} htmlFor="builder-substrate-material" required>
          <select
            id="builder-substrate-material"
            className="text-input"
            value={draft.substrate.material}
            onChange={(event) => onChange({ ...draft, substrate: { ...draft.substrate, material: event.target.value, vendor: "", type_number: "" } })}
          >
            <option value="">{tr("substratePanel.chooseAMaterial")}</option>
            {substrateMaterials.map((material) => <option key={material.id} value={material.name}>{material.name}{material.status === "pending" ? tr("substratePanel.pendingReview") : ""}</option>)}
          </select>
        </FormField>
        <FormField label={tr("substratePanel.supplierProduct")} htmlFor="builder-substrate-product" required>
          <select
            id="builder-substrate-product"
            className="text-input"
            disabled={!selectedMaterial}
            value={productValue}
            onChange={(event) => {
              const product = products.find((item) => String(item.id) === event.target.value);
              onChange({ ...draft, substrate: { ...draft.substrate, vendor: product?.vendor ?? "", type_number: product?.catalog_number ?? "" } });
            }}
          >
            <option value="">{tr("substratePanel.chooseASupplierProduct")}</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.vendor} · {product.catalog_number}{product.status === "pending" ? tr("substratePanel.pendingReview") : ""}</option>)}
          </select>
        </FormField>
        <FormField label={tr("conditionPlanner.deviceLayout")} htmlFor="builder-layout" required>
          <select id="builder-layout" className="text-input" value={currentLayout} onChange={(event) => { const layout = layouts.find((item) => item.code === event.target.value); if (layout) onLayoutChange(layout); }}>
            <option value="">{tr("substratePanel.chooseALayout")}</option>
            {layouts.map((layout) => <option key={layout.code} value={layout.code}>{layout.description} · {layout.substrate_width_mm} × {layout.substrate_length_mm} mm</option>)}
          </select>
        </FormField>
      </div>
      <dl className="builder-facts">
        <div><dt>{tr("substratePanel.footprint")}</dt><dd>{draft.substrate.width_mm || "—"} × {draft.substrate.length_mm || "—"} mm</dd></div>
        <div><dt>{tr("substratePanel.devicesPerSubstrate")}</dt><dd>{layouts.find((layout) => layout.code === currentLayout)?.devices_per_substrate ?? "—"}</dd></div>
        <div><dt>{tr("substratePanel.catalogSource")}</dt><dd>{draft.substrate.vendor && draft.substrate.type_number ? `${draft.substrate.vendor} · ${draft.substrate.type_number}` : tr("reviewPanel.notSelected")}</dd></div>
      </dl>
    </section>
  );
}
