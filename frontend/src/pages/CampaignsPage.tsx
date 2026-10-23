import { enumLabel, localizeAppText, translate as tr, useLanguage as useUiLanguage } from "../i18n";
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
import type { Campaign, CampaignMember } from "../types/api";

const CAMPAIGN_STATUSES = ["active", "closed", "archived"];
const MEMBER_ROLES = ["reader", "participant", "manager"] as const;

export function memberRoleLabel(role: string): string {
  if (role === "reader") return tr("campaignsPage.roleReader");
  if (role === "participant") return tr("campaignsPage.roleParticipant");
  if (role === "manager") return tr("campaignsPage.roleManager");
  return role;
}

export function CampaignsPage() {
  useUiLanguage();
  const { user } = useSession();
  const { show } = useToast();
  const canCreate = user?.role === "instructor" || user?.role === "administrator";
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
  const manageable = rows.filter(
    (row) => user?.role === "administrator" || row.my_role === "manager",
  );

  function replaceCampaign(replacement: Campaign) {
    setCampaigns(rows.map((row) => (row.id === replacement.id ? replacement : row)));
  }

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
      replaceCampaign(updated);
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
      key: "my_role",
      header: tr("campaignsPage.myRole"),
      render: (row) =>
        row.my_role ? memberRoleLabel(row.my_role) : tr("campaignsPage.roleAdministratorView"),
    },
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
  if (manageable.length > 0) {
    columns.push({
      key: "actions",
      header: tr("campaignsPage.manage"),
      render: (row) =>
        user?.role === "administrator" || row.my_role === "manager" ? (
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
        ) : null,
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
        description={canCreate
          ? tr("campaignsPage.organizeRelatedExperimentsUnderStableSeriesIdentifiers")
          : tr("campaignsPage.activeSeriesAvailableForNewExperimentPlans")}
      />
      {canCreate ? (
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
      {manageable.length > 0 ? (
        <section className="panel" aria-labelledby="membership-title">
          <h2 className="panel__title" id="membership-title">{tr("campaignsPage.membershipManagement")}</h2>
          <p className="muted">{tr("campaignsPage.membershipManagementHint")}</p>
          {manageable.map((campaign) => (
            <CampaignMembersPanel
              key={campaign.code}
              campaign={campaign}
              canManageManagers={user?.role === "administrator"}
              currentUserId={user?.id ?? null}
            />
          ))}
        </section>
      ) : null}
    </>
  );
}

function CampaignMembersPanel({
  campaign,
  canManageManagers,
  currentUserId,
}: {
  campaign: Campaign;
  canManageManagers: boolean;
  currentUserId: number | null;
}) {
  useUiLanguage();
  const { show } = useToast();
  const loadMembers = useCallback(
    () => apiFetch<CampaignMember[]>(`/api/campaigns/${campaign.code}/members`),
    [campaign.code],
  );
  const resource = useApiResource(loadMembers);
  const [addUsername, setAddUsername] = useState("");
  const [addRole, setAddRole] = useState<(typeof MEMBER_ROLES)[number]>("participant");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const members = resource.data ?? [];

  async function setRole(member: CampaignMember, role: string) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/campaigns/${campaign.code}/members/${member.user_id}`, {
        method: "PUT",
        body: { role },
      });
      await resource.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update the membership.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(member: CampaignMember) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/campaigns/${campaign.code}/members/${member.user_id}`, {
        method: "DELETE",
      });
      await resource.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove the membership.");
    } finally {
      setBusy(false);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addUsername.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/campaigns/${campaign.code}/members/${addUsername.trim()}`, {
        method: "PUT",
        body: { role: canManageManagers ? addRole : addRole === "manager" ? "participant" : addRole },
      });
      setAddUsername("");
      await resource.reload();
      show("Membership updated.", "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add the member.");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<CampaignMember>[] = [
    {
      key: "member",
      header: tr("campaignsPage.member"),
      render: (row) => (
        <div className="record-title">
          <strong>{row.display_name}</strong>
          <code>{row.username}</code>
        </div>
      ),
    },
    { key: "system_role", header: tr("campaignsPage.systemRole"), render: (row) => enumLabel(row.system_role) },
    {
      key: "role",
      header: tr("campaignsPage.campaignRole"),
      render: (row) => (
        <label className="compact-control">
          <span className="visually-hidden">{tr("campaignsPage.campaignRoleFor")}{row.username}</span>
          <select
            className="text-input text-input--compact"
            aria-label={tr("campaignsPage.campaignRoleForName", { "username": row.username })}
            value={row.role}
            disabled={busy || (row.role === "manager" && !canManageManagers)}
            onChange={(event) => void setRole(row, event.target.value)}
          >
            {MEMBER_ROLES.map((role) => (
              <option key={role} value={role} disabled={role === "manager" && !canManageManagers}>
                {memberRoleLabel(role)}
              </option>
            ))}
          </select>
        </label>
      ),
    },
    {
      key: "actions",
      header: tr("campaignsPage.manage"),
      render: (row) =>
        row.role === "manager" && !canManageManagers ? null : (
          <button
            className="button button--secondary button--small"
            type="button"
            disabled={busy}
            onClick={() => void removeMember(row)}
          >
            {tr("campaignsPage.removeMember")}
          </button>
        ),
    },
  ];
  void currentUserId;

  return (
    <details className="membership-panel">
      <summary>{tr("campaignsPage.membersOf", { "name": campaign.display_name })}</summary>
      <InlineFormError message={localizeAppText(error ?? "")} />
      {resource.status === "error" ? (
        <ErrorState message={resource.error ?? tr("campaignsPage.unableToLoadMembers")} action={
          <button type="button" className="button button--secondary" onClick={() => void resource.reload()}>{tr("versionHistory.retry")}</button>
        } />
      ) : (
        <DataTable
          columns={columns}
          rows={members}
          rowKey={(row) => row.user_id}
          ariaLabel={tr("campaignsPage.membersOf", { "name": campaign.display_name })}
          loading={resource.status === "loading"}
          empty={<EmptyState title={tr("campaignsPage.noMembersYet")} />}
        />
      )}
      <form className="membership-add" onSubmit={(event) => void addMember(event)}>
        <FormField label={tr("campaignsPage.addMemberByUsername")} htmlFor={`add-member-${campaign.code}`} required>
          <input
            id={`add-member-${campaign.code}`}
            className="text-input mono"
            required
            maxLength={64}
            value={addUsername}
            onChange={(event) => setAddUsername(event.target.value)}
          />
        </FormField>
        <FormField label={tr("campaignsPage.campaignRole")} htmlFor={`add-role-${campaign.code}`}>
          <select
            id={`add-role-${campaign.code}`}
            className="text-input"
            value={addRole}
            onChange={(event) => setAddRole(event.target.value as (typeof MEMBER_ROLES)[number])}
          >
            {MEMBER_ROLES.map((role) => (
              <option key={role} value={role} disabled={role === "manager" && !canManageManagers}>
                {memberRoleLabel(role)}
              </option>
            ))}
          </select>
        </FormField>
        <div className="form-grid__action">
          <button className="button button--secondary" type="submit" disabled={busy || !addUsername.trim()}>
            {tr("campaignsPage.addMember")}
          </button>
        </div>
      </form>
    </details>
  );
}
