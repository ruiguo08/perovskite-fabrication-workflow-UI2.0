import { localizeAppText } from "../../i18n";
import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import type { DraftIssue } from "../experiment-builder/types";
import {
  describePresetGaps,
  presetCompleteness,
  presetSummaryFacts,
  type PresetSummaryInput,
} from "./presetSummary";

/**
 * Readable at-a-glance summary of a layer preset: what it contains, how
 * complete it is, and — when it is not — exactly which section is missing
 * which values. Missing values are stated explicitly instead of being filled
 * with default process numbers.
 */
export function PresetSummaryCard({
  preset,
  vcdValves,
  showGaps = true,
}: {
  preset: PresetSummaryInput;
  vcdValves: readonly string[];
  showGaps?: boolean;
}) {
  useUiLanguage();
  const facts = presetSummaryFacts(preset);
  const completeness = presetCompleteness(preset, vcdValves);
  const isPerovskite = preset.layer.layer_type === "perovskite";
  return (
    <div className="preset-summary">
      <div className="preset-summary__chips">
        {isPerovskite ? (
          completeness.templateComplete
            ? <span className="preset-chip preset-chip--ok">{tr("presetDetailView.templateComplete")}</span>
            : <span className="preset-chip preset-chip--warn">{tr("presetSummaryCard.templateIncomplete")}</span>
        ) : (
          <span className="preset-chip">{tr("presetSummaryCard.singleLayerTemplate")}</span>
        )}
        {completeness.experimentReady
          ? <span className="preset-chip preset-chip--ok">{tr("presetDetailView.experimentReady")}</span>
          : <span className="preset-chip preset-chip--partial">{tr("presetSummaryCard.partialTemplate")}</span>}
      </div>
      <dl className="builder-facts preset-summary__facts">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt>{localizeAppText(fact.label ?? "")}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      {!completeness.experimentReady && showGaps ? (
        <PresetGapList issues={completeness.readinessIssues} title={tr("presetSummaryCard.whatThisTemplateIsStillMissing")} />
      ) : null}
      {!completeness.templateComplete && showGaps ? (
        <PresetGapList issues={completeness.templateIssues} title={tr("presetSummaryCard.completeTheseValuesBeforeSavingARevision")} />
      ) : null}
    </div>
  );
}

/**
 * Explain validation issues by section and where to fix them. The JSON path
 * remains available as a secondary hint but is never the only explanation.
 */
export function PresetGapList({ issues, title }: { issues: DraftIssue[]; title: string }) {
  useUiLanguage();
  if (issues.length === 0) {
    return null;
  }
  const groups = describePresetGaps(issues);
  return (
    <div className="preset-gaps" role="note">
      <h4 className="preset-gaps__title">{title}</h4>
      <ul>
        {groups.map((group) => (
          <li key={group.section}>
            <strong>{group.section}</strong> {tr("presetSummaryCard.completeIn")}{group.where}.
            <ul>
              {group.issues.map((issue, index) => (
                <li key={`${issue.path}-${index}`}>
                  {localizeAppText(issue.message ?? "")} <code>{issue.path}</code>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
