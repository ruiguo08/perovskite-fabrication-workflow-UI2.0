import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import type { Role } from "../../auth/session";
import { FormField } from "../../components/FormField";
import type { Baseline, Campaign } from "../../types/api";
import type { ExperimentDraft } from "./types";

interface StartingPointPanelProps {
  role: Role;
  user: { id: number } | null;
  draft: ExperimentDraft;
  campaigns: Campaign[];
  baselines: Baseline[];
  selectedBaselineId: string;
  onCampaignChange: (campaignId: string) => void;
  onBaselineChange: (baselineId: string) => void;
  onStartBlank: () => void;
}

export function StartingPointPanel({
  role,
  user,
  draft,
  campaigns,
  baselines,
  selectedBaselineId,
  onCampaignChange,
  onBaselineChange,
  onStartBlank,
}: StartingPointPanelProps) {
  useUiLanguage();
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active");
  // Step 1 shows only active Shared baselines plus the current user's own
  // active Personal baselines - never a peer's Personal baseline.
  const activeBaselines = baselines.filter(
    (baseline) =>
      baseline.status === "active"
      && baseline.deposition_process !== null
      && (baseline.scope === "shared" || baseline.owner_user_id === user?.id),
  );
  const roleLabel = role === "student" ? "Plan from scratch" : "Start blank";

  return (
    <section className="builder-panel" aria-labelledby="builder-start-title">
      <div className="builder-panel__heading">
        <div><span className="builder-panel__eyebrow">{tr("startingPointPanel.step")}</span><h2 id="builder-start-title">{tr("reviewPanel.startingPoint")}</h2></div>
        {draft.source_baseline_version_id ? <span className="builder-snapshot-mark">{tr("startingPointPanel.expandedSnapshot")}</span> : null}
      </div>
      <p className="builder-help">
        {tr("startingPointPanel.threeWaysToBeginExpandABaselineTheShortcut")}</p>
      <div className="builder-fields builder-fields--two">
        <FormField label={tr("campaignAnalysisPanel.campaign")} htmlFor="builder-campaign" required>
          <select id="builder-campaign" className="text-input" value={draft.campaign_id} onChange={(event) => onCampaignChange(event.target.value)}>
            <option value="">{tr("startingPointPanel.chooseAnActiveCampaign")}</option>
            {activeCampaigns.map((campaign) => <option key={campaign.code} value={campaign.code}>{campaign.display_name} · {campaign.code}</option>)}
          </select>
        </FormField>
        <FormField label={tr("startingPointPanel.baselineReferenceOptionalShortcut")} htmlFor="builder-baseline" hint={tr("startingPointPanel.changingThisSelectionReplacesTheCurrentEditableRecipeWith")}>
          <select id="builder-baseline" className="text-input" value={selectedBaselineId} onChange={(event) => onBaselineChange(event.target.value)}>
            <option value="" disabled={activeBaselines.length === 0}>
              {activeBaselines.length === 0 ? tr("startingPointPanel.noBaselinesAvailableYetPlanFromScratchBelow") : tr("startingPointPanel.chooseAnActiveBaseline")}
            </option>
            {activeBaselines.map((baseline) => <option key={baseline.id} value={baseline.id}>{baseline.name} {tr("layerStackEditor.revision")}{baseline.current_revision_number}</option>)}
          </select>
        </FormField>
      </div>
      <div className="button-row">
        <button type="button" className="button button--secondary" onClick={onStartBlank}>{roleLabel}</button>
        {draft.setup_mode === "blank" ? <span className="builder-help">{tr("startingPointPanel.blankPlanActive")}</span> : null}
      </div>
    </section>
  );
}
