import { enumLabel } from "../i18n";
import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useCallback, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../auth/session";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FormField } from "../components/FormField";
import { InlineFormError } from "../components/InlineFormError";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { apiFetch } from "../lib/api";
import { formatRelativeTime } from "../lib/format";
import { useApiResource } from "../lib/useApiResource";
import type { Campaign } from "../types/api";

const CAMPAIGN_STATUSES = ["active", "closed", "archived"];

export function CampaignsPage() {
  useUiLanguage();
  const { user } = useSession();
  const { show } = useToast();
  const canManage = user?.role === "instructor" || user?.role === "administrator";
  const loadCampaigns = useCallback(
    () => apiFetch<Campaign[]>("/api/campaigns"),
    [],
  );
  const resource = useApiResource(loadCampaigns);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const rows = campaigns ?? resource.data ?? [];

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setCreateError(null);
    try {
      const created = await apiFetch<Campaign>("/api/campaigns", {
        method: "POST",
        body: {
          code: code.trim(),
          display_name: displayName.trim(),
          description: description.trim(),
        },
      });
      setCampaigns([...rows, created]);
      setCode("");
      setDisplayName("");
      setDescription("");
      show("Campaign created.", "success");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to create Campaign.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(campaign: Campaign, status: string) {
    setUpdateError(null);
    try {
      const updated = await apiFetch<Campaign>(`/api/campaigns/${campaign.code}`, {
        method: "PATCH",
        body: { status },
      });
      setCampaigns(rows.map((row) => (row.id === updated.id ? updated : row)));
      show("Campaign status updated.", "success");
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "Unable to update Campaign.");
    }
  }

  const columns: Column<Campaign>[] = [
    {
      key: "campaign",
      header: tr("campaignAnalysisPanel.campaign"),
      render: (row) => (
        <div className="record-title">
          <Link className="record-link" to={`/campaigns/${row.code}`}>
            <strong>{row.display_name}</strong>
          </Link>
          <code>{row.code}</code>
        </div>
      ),
    },
    { key: "description", header: tr("campaignsPage.purpose") },
    {
      key: "status",
      header: tr("presetFilters.status"),
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "updated_at",
      header: tr("presetDetailView.updated"),
      render: (row) => formatRelativeTime(row.updated_at),
    },
  ];
  if (canManage) {
    columns.push({
      key: "actions",
      header: tr("campaignsPage.manage"),
      render: (row) => (
        <label className="compact-control">
          <span className="visually-hidden">{tr("campaignsPage.statusFor")}{row.display_name}</span>
          <select
            className="text-input text-input--compact"
            aria-label={tr("campaignsPage.statusForName", { "name": row.display_name })}
            value={row.status}
            onChange={(event) => void updateStatus(row, event.target.value)}
          >
            {CAMPAIGN_STATUSES.map((status) => (
              <option key={status} value={status}>{enumLabel(status)}</option>
            ))}
          </select>
        </label>
      ),
    });
  }

  if (resource.status === "loading" && resource.data === null) {
    return <div className="page-loading" role="status">{tr("campaignsPage.loadingCampaigns")}</div>;
  }
  if (resource.status === "error" && resource.data === null) {
    return <ErrorState message={resource.error ?? tr("campaignsPage.unableToLoadCampaigns")} action={
      <button type="button" className="button button--secondary" onClick={() => void resource.reload()}>{tr("versionHistory.retry")}</button>
    } />;
  }

  return (
    <>
      <PageHeader
        title={tr("campaignsPage.campaigns")}
        description={canManage
          ? tr("campaignsPage.organizeRelatedExperimentsUnderStableSeriesIdentifiers")
          : tr("campaignsPage.activeSeriesAvailableForNewExperimentPlans")}
      />
      {canManage ? (
        <section className="panel panel--accent" aria-labelledby="create-campaign-title">
          <h2 className="panel__title" id="create-campaign-title">{tr("campaignsPage.createCampaign")}</h2>
          <form className="form-grid form-grid--campaign" onSubmit={(event) => void createCampaign(event)}>
            <FormField label={tr("campaignsPage.campaignCode")} htmlFor="campaign-code" required>
              <input id="campaign-code" className="text-input mono" required maxLength={160} value={code} onChange={(event) => setCode(event.target.value)} />
            </FormField>
            <FormField label={tr("campaignsPage.displayName")} htmlFor="campaign-name" required>
              <input id="campaign-name" className="text-input" required maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </FormField>
            <FormField label={tr("campaignsPage.purpose")} htmlFor="campaign-description">
              <input id="campaign-description" className="text-input" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} />
            </FormField>
            <div className="form-grid__action">
              <button className="button button--primary" type="submit" disabled={submitting}>
                {submitting ? tr("blankPresetForm.creating") : tr("campaignsPage.createCampaign")}
              </button>
            </div>
          </form>
          <InlineFormError message={createError} />
        </section>
      ) : null}
      <section className="panel" aria-labelledby="campaign-directory-title">
        <div className="panel__heading">
          <h2 className="panel__title" id="campaign-directory-title">{tr("campaignsPage.campaignDirectory")}</h2>
          <span className="record-count">{rows.length} {tr("presetFilters.records")}</span>
        </div>
        <InlineFormError message={updateError} />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          ariaLabel={tr("campaignsPage.campaignDirectory")}
          loading={resource.status === "loading"}
          empty={<EmptyState title={tr("campaignsPage.noCampaignsAreAvailable")} />}
        />
      </section>
    </>
  );
}
