import { localizeAppText } from "../i18n";
import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../auth/session";
import { apiFetch } from "../lib/api";
import { formatRelativeTime } from "../lib/format";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageHeader } from "../components/PageHeader";
import { PortfolioBoard } from "../components/PortfolioBoard";
import { StatusBadge } from "../components/StatusBadge";
import type { FabricationBatchListItem, ResultListItem } from "../types/api";

interface Experiment {
  id: number;
  status: string;
  created_at: string;
  updated_at: string;
  campaign_id: string | null;
  experiment_code: string | null;
  series_version: number | null;
  plan_type: string | null;
  plan_status: string | null;
  recipe: {
    device_recipe?: {
      substrate?: { material?: string };
      layers?: { name: string }[];
    } | null;
  };
}

interface Campaign {
  code: string;
  display_name: string;
  status: string;
}

interface Material {
  id: number;
  status: string;
}

interface DeviceLayoutSummary {
  code: string;
}

interface NextAction {
  label: string;
  detail: string;
  to: string | null;
}

function stackSummary(experiment: Experiment): string {
  const recipe = experiment.recipe?.device_recipe;
  if (!recipe) {
    return "—";
  }
  const parts = [recipe.substrate?.material ?? "Substrate"];
  for (const layer of recipe.layers ?? []) {
    parts.push(layer.name);
  }
  return parts.join(" / ");
}

/**
 * First-use setup checklist, shown to staff while the prerequisites students
 * need for their first experiment are missing: an admin-created device
 * layout and an instructor-created active campaign. Items link to the page
 * that fixes them and the whole panel disappears once everything is in
 * place. Students see it too (read-only, with who to ask) because a blocked
 * builder with no explanation is worse than a visible reason.
 */
function SetupChecklist({ role, layouts, campaigns }: { role: string; layouts: DeviceLayoutSummary[]; campaigns: Campaign[] }) {
  useUiLanguage();
  const isStaff = role === "instructor" || role === "administrator";
  const missingLayout = layouts.length === 0;
  const missingCampaign = !campaigns.some((campaign) => campaign.status === "active");
  if (!missingLayout && !missingCampaign) return null;
  const items = [
    missingLayout && {
      title: tr("overviewPage.noDeviceLayoutsYet"),
      detail: isStaff
        ? tr("overviewPage.anAdministratorCreatesTheFirstDeviceLayoutSubstrateSize")
        : tr("overviewPage.askAnAdministratorToCreateTheFirstDeviceLayout"),
      to: "/device-layouts",
      linkLabel: tr("overviewPage.openDeviceLayouts"),
    },
    missingCampaign && {
      title: tr("overviewPage.noActiveCampaignYet"),
      detail: isStaff
        ? tr("overviewPage.everyExperimentBelongsToACampaignCreateTheFirst")
        : tr("overviewPage.askAnInstructorToCreateTheFirstActiveCampaign"),
      to: "/campaigns",
      linkLabel: tr("overviewPage.openCampaigns"),
    },
  ].filter(Boolean) as { title: string; detail: string; to: string; linkLabel: string }[];
  return (
    <section className="panel panel--accent" aria-labelledby="setup-checklist-title">
      <h2 className="panel__title" id="setup-checklist-title">{tr("overviewPage.finishTheFirstUseSetup")}</h2>
      <ul className="setup-checklist">
        {items.map((item) => (
          <li key={item.title} className="setup-checklist__item">
            <span className="setup-checklist__mark" aria-hidden="true">○</span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              {isStaff ? <Link className="button button--secondary button--small" to={item.to}>{item.linkLabel}</Link> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const COLUMNS: Column<Experiment>[] = [
  {
    key: "experiment_code",
    get header() { return tr("experimentsPage.experiment"); },
    render: (row) => <Link className="record-link mono" to={`/experiments/${row.id}`}>{row.experiment_code ?? row.id}</Link>,
  },
  { key: "campaign_id", get header() { return tr("overviewPage.series"); } },
  {
    key: "plan_status",
    get header() { return tr("experimentsPage.plan"); },
    render: (row) =>
      row.plan_status ? <StatusBadge status={row.plan_status} /> : "—",
  },
  {
    key: "status",
    get header() { return tr("presetFilters.status"); },
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: "device_stack",
    get header() { return tr("deviceStackRail.deviceStack"); },
    render: (row) => (
      <span className="stack-summary" title={stackSummary(row)}>
        {stackSummary(row)}
      </span>
    ),
  },
  {
    key: "updated_at",
    get header() { return tr("presetDetailView.updated"); },
    render: (row) => formatRelativeTime(row.updated_at),
  },
];

export function OverviewPage() {
  useUiLanguage();
  const { user } = useSession();
  const [experiments, setExperiments] = useState<Experiment[] | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [layouts, setLayouts] = useState<DeviceLayoutSummary[] | null>(null);
  const [batches, setBatches] = useState<FabricationBatchListItem[] | null>(null);
  const [results, setResults] = useState<ResultListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [experimentRows, campaignRows, materialRows, layoutRows, batchRows, resultRows] = await Promise.all([
        apiFetch<Experiment[]>("/api/experiments"),
        apiFetch<Campaign[]>("/api/campaigns"),
        apiFetch<Material[]>("/api/materials"),
        apiFetch<DeviceLayoutSummary[]>("/api/device-layouts"),
        apiFetch<FabricationBatchListItem[]>("/api/fabrication-batches"),
        apiFetch<ResultListItem[]>("/api/results"),
      ]);
      setExperiments(experimentRows);
      setCampaigns(campaignRows);
      setMaterials(materialRows);
      setLayouts(layoutRows);
      setBatches(batchRows);
      setResults(resultRows);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load overview data.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <ErrorState
        message={localizeAppText(error ?? "")}
        action={
          <button type="button" className="button button--secondary" onClick={() => void load()}>
            {tr("versionHistory.retry")}</button>
        }
      />
    );
  }

  if (experiments === null || campaigns === null || materials === null || layouts === null || batches === null || results === null) {
    return (
      <div
        className="app-loading"
        role="status"
        aria-label={tr("overviewPage.loadingOverviewData")}
      >
        {tr("overviewPage.loadingOverviewData2")}</div>
    );
  }

  const planStatusCounts = new Map<string, number>();
  for (const experiment of experiments ?? []) {
    const planStatus = experiment.plan_status ?? "unknown";
    planStatusCounts.set(planStatus, (planStatusCounts.get(planStatus) ?? 0) + 1);
  }

  const recent = [...experiments]
    .sort((a, b) => {
      const timeDifference = Date.parse(b.updated_at) - Date.parse(a.updated_at);
      return timeDifference === 0 ? b.id - a.id : timeDifference;
    })
    .slice(0, 10);

  const nextActions: NextAction[] = [
    ...results.filter((result) => !result.group_assignment).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).map((result) => ({
      label: tr("overviewPage.assignFilename", { "filename": result.filename }),
      detail: tr("overviewPage.assignSubstrateConditionsToUseThisResultInStatistics"),
      to: `/results/${result.id}`,
    })),
    ...batches.filter((batch) => batch.status === "in_progress").sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).map((batch) => ({
      label: tr("overviewPage.continueBatchCode", { "batch_code": batch.batch_code }),
      detail: tr("overviewPage.recordFabricationStepsAndCompleteTheRunSheet"),
      to: `/experiments/${batch.experiment_id}/batches/${batch.id}`,
    })),
    ...batches.filter((batch) => batch.status === "ready").map((batch) => ({
      label: tr("overviewPage.startBatchCode", { "batch_code": batch.batch_code }),
      detail: tr("overviewPage.theRunSheetIsReadyForFabrication"),
      to: `/experiments/${batch.experiment_id}/batches/${batch.id}`,
    })),
    ...batches.filter((batch) => batch.status === "draft").map((batch) => ({
      label: tr("overviewPage.prepareBatchCode", { "batch_code": batch.batch_code }),
      detail: tr("overviewPage.finishTheRunSheetAndMarkTheBatchReady"),
      to: `/experiments/${batch.experiment_id}/batches/${batch.id}`,
    })),
    ...batches.filter((batch) => batch.status === "completed" && !results.some((result) => result.fabrication_batch_id === batch.id)).map((batch) => ({
      label: tr("overviewPage.uploadResultsForBatchCode", { "batch_code": batch.batch_code }),
      detail: tr("overviewPage.addTheMeasurementCSVThenAssignEachSubstrateTo"),
      to: `/experiments/${batch.experiment_id}/upload`,
    })),
    ...(user?.role === "instructor" || user?.role === "administrator" ? experiments.filter((experiment) => experiment.plan_status === "pending_approval").map((experiment) => ({
      label: tr("overviewPage.approveExperimentCode", { "experiment_code": experiment.experiment_code ?? `experiment ${experiment.id}` }),
      detail: tr("overviewPage.reviewTheSubmittedPlanBeforeFabrication"),
      to: `/experiments/${experiment.id}`,
    })) : []),
    ...experiments.filter((experiment) => experiment.plan_status === "draft").map((experiment) => ({
      label: tr("overviewPage.continueBatchCode", { "batch_code": experiment.experiment_code ?? `experiment ${experiment.id}` }),
      detail: tr("overviewPage.finishAndSubmitTheDraftPlan"),
      to: `/experiments/${experiment.id}`,
    })),
    ...experiments.filter((experiment) => experiment.plan_status === "approved").map((experiment) => ({
      label: tr("overviewPage.releaseExperimentCode", { "experiment_code": experiment.experiment_code ?? `experiment ${experiment.id}` }),
      detail: tr("overviewPage.releaseTheApprovedPlanBeforeFreezingAFabricationBatch"),
      to: `/experiments/${experiment.id}`,
    })),
    ...experiments.filter((experiment) => experiment.plan_status === "released" && !batches.some((batch) => batch.experiment_id === experiment.id && batch.status !== "cancelled")).map((experiment) => ({
      label: tr("overviewPage.freezeABatchForExperimentCode", { "experiment_code": experiment.experiment_code ?? `experiment ${experiment.id}` }),
      detail: tr("overviewPage.atLeastOneActiveBatchIsRequiredToStart"),
      to: `/experiments/${experiment.id}`,
    })),
    ...experiments.filter((experiment) => experiment.plan_status === "released" && batches.some((batch) => batch.experiment_id === experiment.id && batch.status !== "cancelled")).map((experiment) => ({
      label: tr("overviewPage.startFabricationForExperimentCode", { "experiment_code": experiment.experiment_code ?? `experiment ${experiment.id}` }),
      detail: tr("overviewPage.thePlanHasAFabricationBatchAndCanEnter"),
      to: `/experiments/${experiment.id}`,
    })),
    ...experiments.filter((experiment) => experiment.plan_status === "in_progress" &&
      batches.some((batch) => batch.experiment_id === experiment.id && batch.status === "completed") &&
      batches.filter((batch) => batch.experiment_id === experiment.id).every((batch) => batch.status === "completed" || batch.status === "cancelled")
    ).map((experiment) => ({
      label: tr("overviewPage.completeExperimentCode", { "experiment_code": experiment.experiment_code ?? `experiment ${experiment.id}` }),
      detail: tr("overviewPage.allFabricationBatchesAreTerminalFinishThePlanLifecycle"),
      to: `/experiments/${experiment.id}`,
    })),
    ...(user?.role === "student" ? experiments.filter((experiment) => experiment.plan_status === "pending_approval").map((experiment) => ({
      label: experiment.experiment_code ?? tr("campaignWorkspacePage.experimentId", { "id": experiment.id }),
      detail: tr("overviewPage.waitingForInstructorApprovalBeforeThePlanCanBe"),
      to: null,
    })) : []),
  ].slice(0, 5);

  return (
    <>
      <PageHeader title={tr("overviewPage.overview")} description={tr("overviewPage.laboratoryActivityAtAGlance")} />
      <SetupChecklist role={user?.role ?? ""} layouts={layouts} campaigns={campaigns} />
      <section className="panel" aria-labelledby="portfolio-board-title" style={{ marginBottom: "var(--space-5)" }}>
        <h2 className="panel__title" id="portfolio-board-title" style={{ marginBottom: "var(--space-3)" }}>
          {tr("overviewPage.pipelineBoard")}</h2>
        <PortfolioBoard experiments={experiments} batches={batches} results={results} />
      </section>
      <section className="panel next-actions" aria-labelledby="next-actions-title">
        <h2 className="panel__title" id="next-actions-title">{tr("overviewPage.nextActions")}</h2>
        {nextActions.length === 0 ? (
          <p className="run-sheet-muted">{tr("overviewPage.noWorkNeedsAttentionRightNow")}</p>
        ) : (
          <ol className="next-actions__list">
            {nextActions.map((action) => (
              <li key={`${action.to}-${action.label}`}>
                {action.to ? <Link className="record-link" to={action.to}>{action.label}</Link> : <strong>{action.label}</strong>}
                <p>{action.detail}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className="stat-tiles">
        <Link className="stat-tile" to="/experiments" aria-label={tr("overviewPage.nExperimentsViewAllExperiments", { "n": experiments?.length ?? "…" })}>
          <span className="stat-tile__value">{experiments?.length ?? "…"}</span>
          <span className="stat-tile__label">{tr("experimentsPage.experiments")}</span>
        </Link>
        <Link className="stat-tile" to="/campaigns" aria-label={tr("overviewPage.viewCampaigns")}>
          <span className="stat-tile__value">
            {campaigns?.filter((campaign) => campaign.status === "active").length ?? "…"}
          </span>
          <span className="stat-tile__label">{tr("overviewPage.activeCampaigns")}</span>
        </Link>
        <Link className="stat-tile" to="/materials" aria-label={tr("overviewPage.nMaterialsViewAllMaterials", { "n": materials?.length ?? "…" })}>
          <span className="stat-tile__value">{materials?.length ?? "…"}</span>
          <span className="stat-tile__label">{tr("overviewPage.materials")}</span>
        </Link>
      </div>

      <section className="panel">
        <h2 className="panel__title">{tr("experimentsPage.planStatus")}</h2>
        {planStatusCounts.size === 0 ? (
          <EmptyState
            title={tr("overviewPage.noExperimentsYet")}
            description={tr("overviewPage.startByPlanningYourFirstComparativeDepositionExperiment")}
            action={
              <Link className="button button--primary" to="/experiments/new">
                {tr("overviewPage.planAnExperiment")}</Link>
            }
          />
        ) : (
          <ul className="plan-status-list">
            {[...planStatusCounts.entries()].map(([status, count]) => (
              <li key={status} className="plan-status-list__item">
                <StatusBadge status={status} />
                <span className="plan-status-list__count">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel__heading">
          <h2 className="panel__title">{tr("overviewPage.recentExperiments")}</h2>
          <Link className="button button--secondary button--small" to="/experiments">
            {tr("overviewPage.viewAll")}</Link>
        </div>
        <DataTable
          columns={COLUMNS}
          rows={recent}
          rowKey={(row) => row.id}
          ariaLabel={tr("overviewPage.recentExperiments")}
          empty={<EmptyState title={tr("overviewPage.noExperimentsYet")} />}
        />
      </section>
    </>
  );
}
