import { enumLabel, localizeAppText } from "../i18n";
import { useEffect, useMemo } from "react";
import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useCallback, useState, type FormEvent } from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FormField } from "../components/FormField";
import { InlineFormError } from "../components/InlineFormError";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { apiFetch } from "../lib/api";
import { formatDateTime, titleCase } from "../lib/format";
import { useApiResource } from "../lib/useApiResource";
import { useSession } from "../auth/session";
import { bookingPages } from "../features/booking/api";
import type { Role, UserAccount } from "../types/api";

interface WorkflowGrant {
  user_id: number;
  granted_at: string;
  revoked_at: string | null;
}

const ROLES: Role[] = ["student", "instructor", "administrator"];

function sortAccounts(accounts: UserAccount[]): UserAccount[] {
  return [...accounts].sort((left, right) => left.username.localeCompare(right.username));
}

export function UsersPage() {
  useUiLanguage();
  const { show } = useToast();
  const { refresh: refreshSession } = useSession();
  const loadUsers = useCallback(() => apiFetch<UserAccount[]>("/api/users"), []);
  const resource = useApiResource(loadUsers);
  const [users, setUsers] = useState<UserAccount[] | null>(null);
  const rows = useMemo(() => sortAccounts(users ?? resource.data ?? []), [users, resource.data]);
  const [grants, setGrants] = useState<WorkflowGrant[]>([]);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    void bookingPages<WorkflowGrant>("workflow-access")
      .then((rows) => {
        if (alive) setGrants(rows);
      })
      .catch(() => {
        if (alive) setGrants([]);
      });
    return () => {
      alive = false;
    };
  }, [users]);

  const workflowEnabled = useCallback(
    (userId: number) => grants.some((grant) => grant.user_id === userId && !grant.revoked_at),
    [grants],
  );

  function replaceUser(replacement: UserAccount) {
    setUsers((current) => sortAccounts((current ?? rows).some((account) => account.id === replacement.id)
      ? (current ?? rows).map((account) => account.id === replacement.id ? replacement : account)
      : [...(current ?? rows), replacement]));
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const created = await apiFetch<UserAccount>("/api/users", {
        method: "POST",
        body: {
          username: username.trim(),
          display_name: displayName.trim(),
          password,
          role,
        },
      });
      replaceUser(created);
      setUsername("");
      setDisplayName("");
      setRole("student");
      show("Account created.", "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the account.");
    } finally {
      setPassword("");
      setSubmitting(false);
    }
  }

  if (resource.status === "loading" && resource.data === null) {
    return <div className="page-loading" role="status">{tr("usersPage.loadingAccounts")}</div>;
  }
  if (resource.status === "error" && resource.data === null) {
    return <ErrorState message={resource.error ?? tr("usersPage.unableToLoadAccounts")} action={
      <button type="button" className="button button--secondary" onClick={() => void resource.reload()}>{tr("versionHistory.retry")}</button>
    } />;
  }

  return (
    <>
      <PageHeader
        title={tr("usersPage.userAdministration")}
        description={tr("usersPage.createLocalAccountsControlRoleBasedAccessAndReset")}
      />
      <section className="panel panel--accent" aria-labelledby="create-account-title">
        <h2 className="panel__title" id="create-account-title">{tr("usersPage.createAccount")}</h2>
        <form className="account-create-grid" onSubmit={(event) => void createAccount(event)}>
          <FormField label={tr("usersPage.username")} htmlFor="new-username" required>
            <input id="new-username" className="text-input mono" required maxLength={64} autoComplete="off" value={username} onChange={(event) => setUsername(event.target.value)} />
          </FormField>
          <FormField label={tr("campaignsPage.displayName")} htmlFor="new-display-name" required>
            <input id="new-display-name" className="text-input" required maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </FormField>
          <FormField label={tr("usersPage.temporaryPassword")} htmlFor="new-password" required hint={tr("usersPage.useAtLeastCharacters")}>
            <input id="new-password" className="text-input" type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </FormField>
          <FormField label={tr("reviewPanel.role")} htmlFor="new-role" required>
            <select id="new-role" className="text-input" value={role} onChange={(event) => setRole(event.target.value as Role)}>
              {ROLES.map((value) => <option key={value} value={value}>{enumLabel(titleCase(value))}</option>)}
            </select>
          </FormField>
          <div className="form-grid__action">
            <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? tr("blankPresetForm.creating") : tr("usersPage.createAccount")}</button>
          </div>
        </form>
        <InlineFormError message={localizeAppText(error ?? "")} />
      </section>

      <section className="panel" aria-labelledby="account-directory-title">
        <div className="panel__heading">
          <h2 className="panel__title" id="account-directory-title">{tr("usersPage.accounts")}</h2>
          <span className="record-count">{rows.length} {tr("presetFilters.records")}</span>
        </div>
        {rows.length === 0 ? <EmptyState title={tr("usersPage.noAccountsAreAvailable")} /> : (
          <div className="table-scroll">
            <table className="data-table account-table" aria-label={tr("usersPage.userAccounts")}>
              <thead><tr><th>{tr("usersPage.user")}</th><th>{tr("usersPage.state")}</th><th>{tr("usersPage.access")}</th><th>{tr("usersPage.workflowAccess")}</th><th>{tr("usersPage.passwordReset")}</th><th>{tr("usersPage.activity")}</th></tr></thead>
              <tbody>
                {rows.map((account) => <AccountRow key={account.id} account={account} onChange={replaceUser} workflowEnabled={workflowEnabled(account.id)} onWorkflowChange={async (enabled) => {
                  const path = `workflow-access/${account.id}`;
                  try {
                    await apiFetch(`/api/booking/${path}`, { method: "PUT", body: { enabled } });
                    setGrants((current) => {
                      const rest = current.filter((grant) => grant.user_id !== account.id);
                      return enabled
                        ? [...rest, { user_id: account.id, granted_at: new Date().toISOString(), revoked_at: null }]
                        : rest.length === current.length
                          ? current.map((grant) => grant.user_id === account.id ? { ...grant, revoked_at: new Date().toISOString() } : grant)
                          : rest;
                    });
                    await refreshSession();
                    show(tr("usersPage.workflowAccessUpdated"), "success");
                  } catch (caught) {
                    show(caught instanceof Error ? caught.message : tr("usersPage.workflowAccessFailed"), "error");
                  }
                }} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function AccountRow({
  account,
  onChange,
  workflowEnabled,
  onWorkflowChange,
}: {
  account: UserAccount;
  onChange: (account: UserAccount) => void;
  workflowEnabled: boolean;
  onWorkflowChange: (enabled: boolean) => Promise<void>;
}) {
  useUiLanguage();
  const { show } = useToast();
  const [role, setRole] = useState<Role>(account.role);
  const [isActive, setIsActive] = useState(account.is_active);
  const [password, setPassword] = useState("");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);

  async function saveAccess() {
    setSubmitting(true);
    setAccessError(null);
    try {
      const updated = await apiFetch<UserAccount>(`/api/users/${account.id}`, {
        method: "PATCH",
        body: { role, is_active: isActive },
      });
      onChange(updated);
      show("Account access updated.", "success");
    } catch (caught) {
      setAccessError(caught instanceof Error ? caught.message : "Unable to update account access.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setPasswordError(null);
    try {
      await apiFetch<void>(`/api/users/${account.id}/password`, {
        method: "POST",
        body: { password },
      });
      show(`Password reset for ${account.username}.`, "success");
    } catch (caught) {
      setPasswordError(caught instanceof Error ? caught.message : "Unable to reset the password.");
    } finally {
      setPassword("");
      setSubmitting(false);
    }
  }

  return (
    <tr>
      <td><div className="record-title"><strong>{account.display_name}</strong><code>{account.username}</code></div></td>
      <td><StatusBadge status={account.is_active ? "active" : "inactive"} context="account" /><span className="account-state-text">{enumLabel(account.is_active ? "Active" : "Inactive", "account")}</span></td>
      <td>
        <div className="account-access-controls">
          <label>
            <span className="visually-hidden">{tr("usersPage.roleFor")}{account.username}</span>
            <select className="text-input text-input--compact" aria-label={tr("usersPage.roleForUsername", { "username": account.username })} value={role} onChange={(event) => setRole(event.target.value as Role)}>
              {ROLES.map((value) => <option key={value} value={value}>{enumLabel(titleCase(value))}</option>)}
            </select>
          </label>
          <label className="checkbox-control">
            <input type="checkbox" aria-label={tr("usersPage.activeAccountForUsername", { "username": account.username })} checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            {enumLabel("Active", "account")}</label>
          <button className="button button--secondary button--small" type="button" disabled={submitting} onClick={() => void saveAccess()}>{tr("usersPage.saveAccessFor")}{account.username}</button>
        </div>
        <InlineFormError message={localizeAppText(accessError ?? "")} />
      </td>
      <td>
        <div className="account-access-controls">
          <label className="checkbox-control">
            <input
              type="checkbox"
              aria-label={tr("usersPage.workflowAccessForUsername", { "username": account.username })}
              checked={workflowEnabled}
              disabled={workflowBusy}
              onChange={(event) => {
                setWorkflowBusy(true);
                void onWorkflowChange(event.target.checked).finally(() => setWorkflowBusy(false));
              }}
            />
            {tr("usersPage.workflowAccessLabel")}
          </label>
        </div>
      </td>
      <td>
        <form className="password-reset-form" onSubmit={(event) => void resetPassword(event)}>
          <label>
            <span className="visually-hidden">{tr("usersPage.newPasswordFor")}{account.username}</span>
            <input
              className="text-input"
              type="password"
              aria-label={tr("usersPage.newPasswordForUsername", { "username": account.username })}
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="button button--secondary button--small" type="submit" disabled={submitting}>{tr("usersPage.resetPasswordFor")}{account.username}</button>
        </form>
        <InlineFormError message={localizeAppText(passwordError ?? "")} />
      </td>
      <td className="account-activity">
        <span className="account-activity__row">
          <span className="account-activity__label">{tr("usersPage.lastLogin")}</span>
          <time dateTime={account.last_login_at ?? undefined}>{formatDateTime(account.last_login_at)}</time>
        </span>
        <span className="account-activity__row">
          <span className="account-activity__label">{tr("usersPage.passwordChanged")}</span>
          <time dateTime={account.password_changed_at}>{formatDateTime(account.password_changed_at)}</time>
        </span>
        {account.locked_until ? (
          <span className="account-activity__row">
            <span className="account-activity__label">{tr("usersPage.lockedUntil")}</span>
            <time dateTime={account.locked_until}>{formatDateTime(account.locked_until)}</time>
          </span>
        ) : null}
      </td>
    </tr>
  );
}
