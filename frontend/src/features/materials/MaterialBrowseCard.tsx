import { formatRelativeTime } from "../../lib/format";
import type { Material } from "../../types/api";
import { LibFacts, LibRecord, LibTag, LibTags } from "../library/LibraryPrimitives";
import { materialCategoryLabel, materialSummaryFacts } from "./materialSummary";

export interface MaterialBrowseCardProps {
  material: Material;
  canManage: boolean;
  onOpenDetails: (materialId: number) => void;
  onEdit: (materialId: number) => void;
}

/**
 * Browse-card for the material directory: identity, category-aware summary
 * of the recorded specifications, supplier product count, and explicit
 * actions. Only recorded values are shown.
 */
export function MaterialBrowseCard({ material, canManage, onOpenDetails, onEdit }: MaterialBrowseCardProps) {
  const titleId = `material-card-title-${material.id}`;
  const specs = materialSummaryFacts(material);
  return (
    <LibRecord labelledBy={titleId}>
      <LibTags>
        <LibTag tone="info">{materialCategoryLabel(material.category)}</LibTag>
        {material.status !== "active" ? <LibTag tone={material.status === "pending" ? "warn" : undefined}>{material.status}</LibTag> : null}
      </LibTags>
      <div className="lib-record__head">
        <div>
          <h3 className="lib-record__title" id={titleId}>{material.name}</h3>
          <p className="lib-record__subtitle">
            {material.formula.trim() ? material.formula.trim() : "No formula recorded"}
            {material.cas_number.trim() ? ` · CAS ${material.cas_number.trim()}` : ""}
          </p>
        </div>
      </div>
      {specs.length > 0 ? (
        <LibFacts facts={specs} singleColumn={specs.length === 1} />
      ) : (
        <p className="lib-muted">No specifications recorded.</p>
      )}
      <div className="lib-card-foot">
        <span className="lib-muted">
          {material.products.length} supplier product{material.products.length === 1 ? "" : "s"} · updated {formatRelativeTime(material.updated_at)}
        </span>
        <div className="lib-actions">
          <button
            type="button"
            className="button button--secondary button--small"
            onClick={() => onOpenDetails(material.id)}
          >
            View details
          </button>
          {canManage ? (
            <button type="button" className="button button--secondary button--small" onClick={() => onEdit(material.id)}>
              Edit
            </button>
          ) : null}
        </div>
      </div>
    </LibRecord>
  );
}
