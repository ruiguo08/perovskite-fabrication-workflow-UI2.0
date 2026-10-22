import { enumLabel, localizeAppText } from "../../i18n";
import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import type { Baseline, Campaign, DeviceLayout } from "../../types/api";
import type { DraftIssue, ExperimentDraft } from "./types";

interface ReviewPanelProps {
  draft: ExperimentDraft;
  campaigns: Campaign[];
  baselines: Baseline[];
  layouts: DeviceLayout[];
  issues: DraftIssue[];
}

export function ReviewPanel({ draft, campaigns, baselines, layouts, issues }: ReviewPanelProps) {
  useUiLanguage();
  const campaign = campaigns.find((item) => item.code === draft.campaign_id);
  const baseline = baselines.find((item) => item.current_version_id === draft.source_baseline_version_id);

  return (
    <section className="builder-panel builder-panel--review" aria-labelledby="builder-review-title">
      <div className="builder-panel__heading">
        <div><span className="builder-panel__eyebrow">{tr("reviewPanel.step")}</span><h2 id="builder-review-title">{tr("reviewPanel.reviewCompletePlan")}</h2></div>
        <span className={`builder-review-state ${issues.length === 0 ? "builder-review-state--ready" : ""}`}>{issues.length === 0 ? tr("reviewPanel.readyToSave") : tr("reviewPanel.nItemsNeedAttention", { "n": issues.length })}</span>
      </div>

      {issues.length > 0 ? (
        <div className="builder-issue-summary" role="alert" aria-labelledby="builder-issues-title">
          <h3 id="builder-issues-title">{tr("baselineAuthoring.completeTheseValuesBeforeSaving")}</h3>
          <ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}><code>{issue.path}</code> — {localizeAppText(issue.message ?? "")}</li>)}</ul>
        </div>
      ) : null}

      <div className="builder-review-grid">
        <article>
          <h3>{tr("reviewPanel.provenance")}</h3>
          <dl>
            <div><dt>{tr("campaignAnalysisPanel.campaign")}</dt><dd>{campaign ? `${campaign.display_name} · ${campaign.code}` : tr("reviewPanel.notSelected")}</dd></div>
            <div><dt>{tr("reviewPanel.startingPoint")}</dt><dd>{baseline ? tr("reviewPanel.nameRevisionN", { "name": baseline.name, "n": baseline.current_revision_number }) : tr("reviewPanel.blankPlan")}</dd></div>
            <div><dt>{tr("reviewPanel.baselineVersion")}</dt><dd>{draft.source_baseline_version_id ?? tr("reviewPanel.none")}</dd></div>
            <div><dt>{tr("reviewPanel.setupMode")}</dt><dd>{draft.setup_mode}</dd></div>
          </dl>
        </article>
        <article>
          <h3>{tr("deviceExclusionsPanel.substrate")}</h3>
          <p>{draft.substrate.material || tr("reviewPanel.notSelected")} · {draft.substrate.vendor || tr("reviewPanel.noSupplier")} · {draft.substrate.type_number || tr("reviewPanel.noCatalogNumber")}</p>
          <p>{draft.substrate.width_mm || "—"} × {draft.substrate.length_mm || "—"} mm</p>
        </article>
        <article>
          <h3>{tr("reviewPanel.orderedFunctionalLayers")}</h3>
          <ol className="builder-review-layers">{draft.layers.map((layer, index) => <li key={`${layer.layer_type}-${index}`}><strong>{layer.name}</strong><span>{enumLabel(layer.role)} · {layer.process?.method ?? (layer.layer_type === "perovskite" ? tr("reviewPanel.spinCoatingVCD") : tr("reviewPanel.noProcess"))}</span></li>)}</ol>
        </article>
        <article>
          <h3>{tr("recipeSnapshotSummary.perovskiteProcess")}</h3>
          <dl>
            <div><dt>{tr("reviewPanel.spinStages")}</dt><dd>{draft.deposition_process.spin_steps.length}</dd></div>
            <div><dt>{tr("reviewPanel.vcdStages")}</dt><dd>{draft.deposition_process.vcd_stages.length}</dd></div>
            <div><dt>{tr("reviewPanel.gasBackfills")}</dt><dd>{draft.deposition_process.gas_backfill_stages.length}</dd></div>
            <div><dt>{tr("reviewPanel.annealingStages")}</dt><dd>{draft.deposition_process.anneal_steps.length}</dd></div>
            <div><dt>{tr("reviewPanel.vcdSequence")}</dt><dd><code>{draft.deposition_process.vcd_step_sequence?.join(" → ") || tr("recipeSnapshotSummary.notRecorded")}</code></dd></div>
          </dl>
        </article>
      </div>

      <div className="builder-review-conditions">
        <h3>{tr("reviewPanel.conditionPlan")}</h3>
        <div className="table-wrap"><table><thead><tr><th>{tr("campaignAnalysisPanel.condition")}</th><th>{tr("reviewPanel.role")}</th><th>{tr("conditionCard.layout")}</th><th>{tr("conditionCard.substrates")}</th><th>{tr("reviewPanel.expectedDevices")}</th><th>{tr("reviewPanel.snapshot")}</th></tr></thead><tbody>
          {draft.conditions.map((condition) => {
            const layout = layouts.find((item) => item.code === condition.device_layout_code);
            return <tr key={condition.group_id}><td>{condition.name}</td><td>{condition.kind}</td><td>{layout?.description ?? (condition.device_layout_code || tr("reviewPanel.notSelected"))}</td><td>{condition.planned_substrate_count}</td><td>{layout ? layout.devices_per_substrate * condition.planned_substrate_count : "—"}</td><td>{condition.kind === "target" ? tr("reviewPanel.completeIndependentCopy") : tr("reviewPanel.primaryRecipe")}</td></tr>;
          })}
        </tbody></table></div>
      </div>
    </section>
  );
}
