import { enumLabel } from "../i18n";
import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { apiFetch } from "../lib/api";
import { formatNumber, formatRelativeTime } from "../lib/format";
import { useApiResource } from "../lib/useApiResource";
import type { FabricationBatchListItem } from "../types/api";

const BATCH_STATUSES = ["draft", "ready", "in_progress", "completed", "cancelled"];

export function FabricationBatchesPage() {
  useUiLanguage();
  const [statusFilter, setStatusFilter] = useState("all");
  const loadBatches = useCallback(() => {
    const query = statusFilter === "all" ? "" : `?status=${statusFilter}`;
    return apiFetch<FabricationBatchListItem[]>(`/api/fabrication-batches${query}`);
  }, [statusFilter]);
  const resource = useApiResource(loadBatches, { resetOnLoaderChange: true });

  if (resource.status === "loading" && resource.data === null) {
    return <div className="page-loading" role="status">{tr("fabricationBatchesPage.loadingFabricationBatches")}</div>;
  }
  if (resource.status === "error") {
    const retry = (
      <button type="button" className="button button--secondary" onClick={() => void resource.reload()}>
        {tr("versionHistory.retry")}</button>
    );
    if (resource.data === null) {
      return (
        <ErrorState
          title={tr("fabricationBatchesPage.unableToLoadFabricationBatches")}
          message={resource.error ?? tr("fabricationBatchesPage.theFabricationBatchesCouldNotBeLoaded")}
          action={retry}
        />
      );
    }
    return (
      <div className="inline-form-error" role="alert">
        <p>
          {tr("fabricationBatchesPage.unableToRefreshFabricationBatches")}{resource.error ?? tr("fabricationBatchesPage.theRequestFailed")}{" "}
          {tr("fabricationBatchesPage.theDisplayedResultsMayNotMatchTheSelectedFilter")}</p>
        {retry}
      </div>
    );
  }
  const batches = resource.data ?? [];

  return (
    <>
      <PageHeader
        title={tr("experimentDetailPage.fabricationBatches")}
        description={tr("fabricationBatchesPage.fabricationBatchesAcrossAllCampaignsNewestFirst")}
        meta={tr("summary.records", { n: batches.length })}
      />
      <section className="panel" aria-labelledby="batch-list-title">
        <div className="panel__heading">
          <h2 className="panel__title" id="batch-list-title">{tr("fabricationBatchesPage.batchRecords")}</h2>
          <label className="form-field">
            <span className="form-field__label">{tr("batchDetailPage.batchStatus")}</span>
            <select
              className="text-input"
              aria-label={tr("batchDetailPage.batchStatus")}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">{tr("presetFilters.allStatuses")}</option>
              {BATCH_STATUSES.map((status) => (
                <option key={status} value={status}>{enumLabel(status)}</option>
              ))}
            </select>
          </label>
        </div>
        {batches.length === 0 ? (
          <EmptyState title={tr("experimentDetailPage.noFabricationBatchesYet")} description={tr("fabricationBatchesPage.fabricationBatchesAppearHereOnceAPlanIsReleased")} />
        ) : (
          <div className="batch-list">
            {batches.map((batch) => (
              <article className="batch-summary-card" key={batch.id} data-batch-row={batch.id}>
                <div className="batch-summary-card__row">
                  <Link
                    className="record-link"
                    to={`/experiments/${batch.experiment_id}/batches/${batch.id}`}
                  >
                    {batch.batch_code}
                  </Link>
                  <StatusBadge status={batch.status} />
                </div>
                <span className="record-title">
                  {batch.experiment_code ?? tr("campaignWorkspacePage.experimentId", { "id": batch.experiment_id })}
                </span>
                <span>
                  {batch.best_pce !== null
                    ? tr("fabricationBatchesPage.bestPCEXJscYMACm", { "x": formatNumber(batch.best_pce, 2), "y": formatNumber(batch.best_jsc, 1) })
                    : tr("fabricationBatchesPage.noMeasuredResultsYet")}
                </span>
                <span>{batch.notes || tr("batchDetailPage.noBatchNotes")}</span>
                <details className="provenance-disclosure">
                  <summary>{tr("reviewPanel.provenance")}</summary>
                  <div className="provenance-disclosure__body">
                    <code title={batch.condition_set_hash}>{batch.condition_set_hash.slice(0, 16)}…</code>
                    <span className="run-sheet-muted">{tr("fabricationBatchesPage.created")}{formatRelativeTime(batch.created_at)}</span>
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