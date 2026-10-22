import { translate as tr, useLanguage as useUiLanguage, enumLabel } from "../../i18n";
import { formatDateTime } from "../../lib/format";
import type { LayerPreset } from "../../types/api";
import { LibCardNote, LibFacts, LibRecord, LibTag, LibTags } from "../library/LibraryPrimitives";
import {
  firstGapSummary,
  layerTypeLabel,
  presetSummaryFacts,
  processSummary,
  roleLabel,
} from "./presetSummary";

export interface PresetBrowseCardProps {
  preset: LayerPreset;
  vcdValves: readonly string[];
  canEdit: boolean;
  promoteOnly?: boolean;
  onOpenDetails: (presetId: number) => void;
  onEdit: (presetId: number) => void;
  onPromote?: (preset: LayerPreset) => void;
}

/**
 * Browse-card for the layer preset library: identity, scope/status, a short
 * formulation and process summary, one plain-language completeness note, and
 * explicit actions. Long hashes and raw JSON stay out of the default view.
 */
export function PresetBrowseCard({
  preset,
  vcdValves,
  canEdit,
  promoteOnly = false,
  onOpenDetails,
  onEdit,
  onPromote,
}: PresetBrowseCardProps) {
  useUiLanguage();
  const isPerovskite = preset.layer.layer_type === "perovskite";
  const gap = firstGapSummary(preset, vcdValves);
  const editable = !promoteOnly && canEdit && preset.status === "active";
  const facts = presetSummaryFacts(preset)
    .filter((fact) => ["Formulation", "Solids", "Solvents", "Method"].includes(fact.label))
    .map((fact) => ({ label: fact.label, value: fact.value }));
  const titleId = `preset-card-title-${preset.id}`;
  return (
    <LibRecord labelledBy={titleId}>
      <LibTags>
        <LibTag tone={preset.scope === "shared" ? "info" : undefined}>{roleLabel(preset.layer.role)}</LibTag>
        <LibTag>{layerTypeLabel(preset.layer.layer_type)}</LibTag>
        <LibTag tone="scope">{enumLabel(preset.scope)}</LibTag>
        {preset.status !== "active" ? <LibTag tone="warn">{enumLabel(preset.status, "catalog")}</LibTag> : null}
      </LibTags>
      <div className="lib-record__head">
        <div>
          <h3 className="lib-record__title" id={titleId}>{preset.name}</h3>
          <p className="lib-record__subtitle">
            {preset.layer.name} · {processSummary(preset)}
          </p>
        </div>
      </div>
      <LibFacts facts={facts} singleColumn={facts.length <= 1} />
      {isPerovskite && gap ? (
        <LibCardNote>
          {tr("presetBrowseCard.incompleteTemplateMissing")}{gap}{tr("presetBrowseCard.openTheDetailsToCompleteTheDepositionProcess")}</LibCardNote>
      ) : null}
      {!isPerovskite && gap ? (
        <LibCardNote tone="info">
          {tr("presetBrowseCard.partialTemplateMissing")}{gap}{tr("presetBrowseCard.completeTheseValuesPerExperimentOrFinishTheTemplate")}</LibCardNote>
      ) : null}
      <div className="lib-card-foot">
        <span className="lib-muted">r{preset.current_revision_number} {tr("presetBrowseCard.updated")}{formatDateTime(preset.updated_at)}</span>
        <div className="lib-actions">
          <button
            type="button"
            className="button button--secondary button--small"
            onClick={() => onOpenDetails(preset.id)}
          >
            {tr("presetBrowseCard.viewDetails")}</button>
          {editable ? (
            <button type="button" className="button button--secondary button--small" onClick={() => onEdit(preset.id)}>
              {tr("presetBrowseCard.edit")}</button>
          ) : null}
          {onPromote ? (
            <button type="button" className="button button--secondary button--small" onClick={() => onPromote(preset)}>
              {tr("presetBrowseCard.promoteToShared")}</button>
          ) : null}
        </div>
      </div>
    </LibRecord>
  );
}
