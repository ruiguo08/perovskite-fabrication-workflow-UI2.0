import { enumLabel } from "../i18n";
import { useMemo } from "react";
import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FormField } from "../components/FormField";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { apiFetch } from "../lib/api";
import { formatNumber, formatRelativeTime } from "../lib/format";
import { useApiResource } from "../lib/useApiResource";
import type { Experiment } from "../types/api";

function stackSummary(experiment: Experiment): string {
  // Derived from the control condition snapshot server-side.
  return experiment.device_summary ?? "";
}

export function ExperimentsPage() {
  useUiLanguage();
  const loadExperiments = useCallback(() => apiFetch<Experiment[]>("/api/experiments"), []);
  const resource = useApiResource(loadExperiments);
  const [campaign, setCampaign] = useState("all");
  const [planStatus, setPlanStatus] = useState("all");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...(resource.data ?? [])]
      .filter((experiment) => campaign === "all" || (experiment.campaign_id ?? "unassigned") === campaign)
      .filter((experiment) => planStatus === "all" || (experiment.plan_status ?? "unknown") === planStatus)
      .filter((experiment) => {
        if (!normalizedQuery) {
          return true;
        }
        return [
          experiment.experiment_code ?? String(experiment.id),
          experiment.campaign_id ?? "unassigned",
          stackSummary(experiment),
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at) || right.id - left.id);
  }, [campaign, planStatus, query, resource.data]);
  const campaigns = useMemo(() => [...new Set((resource.data ?? []).map((row) => row.campaign_id ?? "unassigned"))].sort(), [resource.data]);
  const planStatuses = useMemo(() => [...new Set((resource.data ?? []).map((row) => row.plan_status ?? "unknown"))].sort(), [resource.data]);

  const columns: Column<Experiment>[] = [
    {
      key: "experiment_code",
      header: tr("experimentsPage.experiment"),
      render: (row) => <Link className="record-link mono" to={`/experiments/${row.id}`}>{row.experiment_code ?? row.id}</Link>,
    },
    { key: "campaign_id", header: tr("campaignAnalysisPanel.campaign"), render: (row) => row.campaign_id ?? "unassigned" },
    { key: "plan_type", header: tr("conditionPlanner.planType"), render: (row) => enumLabel(row.plan_type) ?? "—" },
    {
      key: "best_pce",
      header: tr("experimentsPage.bestPCE"),
      render: (row) =>
        row.best_pce !== null ? (
          <strong>{formatNumber(row.best_pce, 2)} %</strong>
        ) : (
          <span className="numeric-cell" style={{ color: "var(--steel-soft)" }}>—</span>
        ),
    },
    { key: "plan_status", header: tr("experimentsPage.plan"), render: (row) => row.plan_status ? <StatusBadge status={row.plan_status} /> : "—" },
    { key: "status", header: tr("experimentsPage.record"), render: (row) => <StatusBadge status={row.status} /> },
    { key: "stack", header: tr("deviceStackRail.deviceStack"), render: (row) => <span className="stack-summary" title={stackSummary(row)}>{stackSummary(row)}</span> },
    { key: "updated_at", header: tr("presetDetailView.updated"), render: (row) => formatRelativeTime(row.updated_at) },
  ];

  if (resource.status === "loading" && resource.data === null) {
    return <div className="page-loading" role="status">{tr("experimentsPage.loadingExperiments")}</div>;
  }
  if (resource.status === "error" && resource.data === null) {
    return <ErrorState message={resource.error ?? tr("experimentsPage.unableToLoadExperiments")} action={
      <button type="button" className="button button--secondary" onClick={() => void resource.reload()}>{tr("versionHistory.retry")}</button>
    } />;
  }

  return (
    <>
      <PageHeader
        title={tr("experimentsPage.experiments")}
        description={tr("experimentsPage.plansAndRecordsAcrossAllCampaigns")}
        actions={<Link className="button button--primary" to="/experiments/new">{tr("experimentsPage.planNewExperiment")}</Link>}
      />
      <section className="panel experiment-filters" aria-label={tr("experimentsPage.experimentFilters")}>
        <FormField label={tr("campaignAnalysisPanel.campaign")} htmlFor="experiment-campaign-filter">
          <select id="experiment-campaign-filter" className="text-input" value={campaign} onChange={(event) => setCampaign(event.target.value)}>
            <option value="all">{tr("experimentsPage.allCampaigns")}</option>
            {campaigns.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </FormField>
        <FormField label={tr("experimentsPage.planStatus")} htmlFor="experiment-status-filter">
          <select id="experiment-status-filter" className="text-input" value={planStatus} onChange={(event) => setPlanStatus(event.target.value)}>
            <option value="all">{tr("presetFilters.allStatuses")}</option>
            {planStatuses.map((value) => <option key={value} value={value}>{enumLabel(value)}</option>)}
          </select>
        </FormField>
        <FormField label={tr("experimentsPage.searchExperiments")} htmlFor="experiment-search">
          <input id="experiment-search" className="text-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr("experimentsPage.codeCampaignOrMaterial")} />
        </FormField>
        <span className="record-count experiment-filters__count">{rows.length} {tr("presetFilters.records")}</span>
      </section>
      <section className="panel">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          ariaLabel={tr("experimentsPage.experimentRecords")}
          loading={resource.status === "loading"}
          empty={<EmptyState title={tr("experimentsPage.noExperimentsMatchTheseFilters")} />}
        />
      </section>
    </>
  );
}
