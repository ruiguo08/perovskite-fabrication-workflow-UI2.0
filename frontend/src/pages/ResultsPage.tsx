import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageHeader } from "../components/PageHeader";
import { apiFetch } from "../lib/api";
import { formatRelativeTime } from "../lib/format";
import { useApiResource } from "../lib/useApiResource";
import type { ResultListItem } from "../types/api";

function buildQuery(experimentId: string, batchId: string): string {
  const params = new URLSearchParams();
  if (experimentId.trim() !== "") {
    params.set("experiment_id", experimentId.trim());
  }
  if (batchId.trim() !== "") {
    params.set("fabrication_batch_id", batchId.trim());
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function ResultsPage() {
  useUiLanguage();
  const [experimentId, setExperimentId] = useState("");
  const [batchId, setBatchId] = useState("");
  const loadResults = useCallback(
    () => apiFetch<ResultListItem[]>(`/api/results${buildQuery(experimentId, batchId)}`),
    [experimentId, batchId],
  );
  const resource = useApiResource(loadResults, { resetOnLoaderChange: true });

  if (resource.status === "loading" && resource.data === null) {
    return <div className="page-loading" role="status">{tr("resultsPage.loadingResults")}</div>;
  }
  if (resource.status === "error") {
    const retry = (
      <button type="button" className="button button--secondary" onClick={() => void resource.reload()}>
        {tr("versionHistory.retry")}</button>
    );
    if (resource.data === null) {
      return (
        <ErrorState
          title={tr("resultsPage.unableToLoadResults")}
          message={resource.error ?? tr("resultsPage.theResultsCouldNotBeLoaded")}
          action={retry}
        />
      );
    }
    return (
      <div className="inline-form-error" role="alert">
        <p>
          {tr("resultsPage.unableToRefreshResults")}{resource.error ?? tr("fabricationBatchesPage.theRequestFailed")}{" "}
          {tr("resultsPage.theDisplayedRowsMayNotMatchTheSelectedFilter")}</p>
        {retry}
      </div>
    );
  }
  const results = resource.data ?? [];

  return (
    <>
      <PageHeader
        title={tr("resultsPage.results")}
        description={tr("resultsPage.uploadedResultFilesAcrossAllCampaignsNewestFirst")}
        meta={`${results.length} records`}
      />
      <section className="panel" aria-labelledby="result-list-title">
        <div className="panel__heading">
          <h2 className="panel__title" id="result-list-title">{tr("resultsPage.resultRecords")}</h2>
          <div className="filter-grid">
            <label className="form-field">
              <span className="form-field__label">{tr("experimentsPage.experiment")}</span>
              <input
                className="text-input"
                aria-label={tr("experimentsPage.experiment")}
                inputMode="numeric"
                placeholder={tr("resultsPage.experimentId")}
                value={experimentId}
                onChange={(event) => setExperimentId(event.target.value)}
              />
            </label>
            <label className="form-field">
              <span className="form-field__label">{tr("campaignAnalysisPanel.batch")}</span>
              <input
                className="text-input"
                aria-label={tr("campaignAnalysisPanel.batch")}
                inputMode="numeric"
                placeholder={tr("resultsPage.fabricationBatchId")}
                value={batchId}
                onChange={(event) => setBatchId(event.target.value)}
              />
            </label>
          </div>
        </div>
        {results.length === 0 ? (
          <EmptyState
            title={tr("resultsPage.noCharacterizationResults")}
            description={tr("resultsPage.uploadedResultFilesAppearHereOnceAnInProgress")}
          />
        ) : (
          <div className="result-list">
            {results.map((result) => (
              <article className="result-summary-card" key={result.id} data-result-row={result.id}>
                <div className="result-summary-card__row">
                  <Link className="record-link" to={`/results/${result.id}`}>
                    {result.filename}
                  </Link>
                  <span className="run-sheet-muted">{formatRelativeTime(result.created_at)}</span>
                </div>
                <span className="record-title">
                  {result.experiment_code ?? tr("campaignWorkspacePage.experimentId", { "id": result.experiment_id })}
                </span>
                <span className="run-sheet-muted">{result.batch_code}</span>
                <span className="run-sheet-muted">
                  {result.group_assignment ? tr("resultsPage.assigned") : tr("deviceExclusionsPanel.unassigned")}
                </span>
                <Link className="record-link" to={`/results/${result.id}`}>{tr("experimentDetailPage.viewDirectionSpecificStatistics")}</Link>
                <details className="provenance-disclosure">
                  <summary>{tr("reviewPanel.provenance")}</summary>
                  <div className="provenance-disclosure__body">
                    <span className="run-sheet-muted">{result.size_bytes} bytes</span>
                    <code title={result.sha256}>{result.sha256.slice(0, 16)}…</code>
                    <span className="run-sheet-muted">{tr("resultDetailPage.schemaV")}{result.analysis_schema_version}</span>
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
