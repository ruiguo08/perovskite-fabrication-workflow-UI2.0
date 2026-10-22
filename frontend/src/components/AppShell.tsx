import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSession, type Role } from "../auth/session";
import { PipelineHeader } from "./PipelineHeader";
import { useToast } from "./Toast";
import { useLanguage, localizeKnownError } from "../i18n";
import type { MessageKey } from "../i18n/messages";
import { LanguageSwitcher } from "./LanguageSwitcher";

const ROLE_RANK: Record<Role, number> = {
  student: 1,
  instructor: 2,
  administrator: 3,
};

interface NavItemDef {
  label: MessageKey;
  /** React route path relative to /app; overrides legacyPath when present. */
  path?: string;
  /** Full legacy URL used until the React route exists in a later phase. */
  legacyPath?: string;
  /** Minimum role that may see the item. */
  minRole?: Role;
  /** Marked until a React route (or legacy page) exists for it. */
  disabled?: boolean;
  workflow?: boolean;
}

const NAV_GROUPS: { label: MessageKey; items: NavItemDef[] }[] = [
  { label: 'booking.equipment', items: [{label:'booking.title',path:'/booking'}] },
  {
    label: "nav.laboratory",
    items: [
      { label: "nav.overview", path: "/" },
      { label: "nav.workflow", path: "/workflow" },
      { label: "nav.experiments", path: "/experiments" },
      { label: "nav.batches", path: "/fabrication-batches" },
      { label: "nav.results", path: "/results" },
      { label: "nav.analysis", path: "/analysis" },
    ],
  },
  {
    label: "nav.library",
    items: [
      { label: "nav.materials", path: "/materials" },
      { label: "nav.presets", path: "/layer-presets" },
      { label: "nav.baselines", path: "/baselines" },
      { label: "nav.layouts", path: "/device-layouts" },
    ],
  },
  {
    label: "nav.management",
    items: [
      { label: "nav.campaigns", path: "/campaigns" },
      { label: "nav.users", path: "/users", minRole: "administrator" },
    ],
  },
];

function canSee(item: NavItemDef, role: Role): boolean {
  const minimum = item.minRole ? ROLE_RANK[item.minRole] : 1;
  return ROLE_RANK[role] >= minimum;
}

export function AppShell() {
  const { t } = useLanguage();
  const { user, refresh } = useSession();
  const location = useLocation();
  useEffect(() => { void refresh(); }, [location.pathname, refresh]);
  const { show: showToast } = useToast();
  if (!user) {
    return null;
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        {t("nav.skip")}
      </a>
      <aside className="shell__nav">
        <Link to="/" className="shell__brand">
          <span className="shell__brand-title">{t("app.brand")}</span>
          <span className="shell__brand-subtitle">{t("app.subtitle")}</span>
        </Link>
        <nav aria-label={t("nav.primary")}>
          {NAV_GROUPS.filter(group => user.workflow_access || group.label === 'booking.equipment' || (group.label === 'nav.management' && user.role === 'administrator')).map((group) => (
            <div key={group.label} className="nav-group">
              <h2 className="nav-group__label">{t(group.label)}</h2>
              <ul className="nav-group__list">
                {group.items
                  .filter((item) => canSee(item, user.role) && (user.workflow_access || item.path === '/booking' || item.path === '/users'))
                  .map((item) => {
                    // A nav item is active when the current path's first
                    // segment matches the item's path, so /experiments/6/batches/1
                    // highlights "Experiments" while the run-sheet route
                    // (/experiments/:id/batches/:batchId) is excluded and
                    // reported by pathSegments below as "Fabrication batches".
                    const active =
                      item.path !== undefined && item.path !== "/"
                        ? location.pathname.startsWith(item.path)
                        : location.pathname === "/";
                    const effectiveActive =
                      item.path === "/experiments" &&
                      /^\/experiments\/[^/]+\/batches(\/|$)/.test(location.pathname)
                        ? false
                        : item.path === "/fabrication-batches" &&
                            /^\/experiments\/[^/]+\/batches(\/|$)/.test(location.pathname)
                          ? true
                          : active;
                    if (item.disabled) {
                      return (
                        <li key={item.label}>
                          <button
                            type="button"
                            className="nav-item nav-item--disabled"
                            aria-disabled="true"
                            title={t("nav.later")}
                            onClick={() =>
                              showToast(
                                t("nav.laterSection", { label: t(item.label) }),
                                "info",
                              )
                            }
                          >
                            {t(item.label)}
                          </button>
                        </li>
                      );
                    }
                    if (item.path !== undefined) {
                      return (
                        <li key={item.label}>
                          <Link
                            to={item.path}
                            className={`nav-item${effectiveActive ? " nav-item--active" : ""}`}
                            aria-current={effectiveActive ? "page" : undefined}
                          >
                            {t(item.label)}
                          </Link>
                        </li>
                      );
                    }
                    return (
                      <li key={item.label}>
                        <a className="nav-item" href={item.legacyPath}>
                          {t(item.label)}
                        </a>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <div className="shell__main">
        <header className="topbar">
          <LanguageSwitcher />
          <span className="topbar__role">
            {t(`role.${user.role}`)}
          </span>
          <span className="topbar__user">{user.display_name}</span>
          <LogoutButton />
        </header>
        {user.workflow_access && <PipelineHeader />}
        <main id="main-content" className="shell__content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function LogoutButton() {
  const { t } = useLanguage();
  const { logout } = useSession();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setSubmitting(true);
    setError(null);
    try {
      await logout();
    } catch (caught) {
      // The server session may still be active; show an actionable error
      // instead of silently navigating away or swallowing the rejection.
      setError(caught instanceof Error ? caught.message : "Unable to log out.");
      setSubmitting(false);
      return;
    }
    navigate("/login", { replace: true });
  }

  return (
    <div className="logout-control">
      <button
        type="button"
        className="button button--secondary button--small"
        disabled={submitting}
        onClick={() => void handleLogout()}
      >
        {submitting ? t("auth.loggingOut") : t("auth.logout")}
      </button>
      {error ? (
        <p className="inline-form-error" role="alert">
          {localizeKnownError(error)}{" "}
          <button
            type="button"
            className="button button--link"
            onClick={() => void handleLogout()}
          >
            {t("common.retry")}
          </button>
        </p>
      ) : null}
    </div>
  );
}
