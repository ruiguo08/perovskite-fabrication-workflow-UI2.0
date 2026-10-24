import { useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../auth/session";
import { localizeAppText, useLanguage } from "../i18n";
import { apiFetch } from "../lib/api";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

/** Extract the one-time token from the URL fragment, then scrub the fragment
 * from the address bar and history. The fragment never reaches the server;
 * clearing it immediately keeps the secret out of referrer values, shared
 * screens, and the browser's back/forward history. */
function consumeRecoveryToken(): string {
  const { hash, pathname } = window.location;
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token") ?? "";
  if (hash) window.history.replaceState(null, "", pathname);
  return token;
}

export function PasswordPage({ recovery = false }: { recovery?: boolean }) {
  const { t } = useLanguage();
  const { refresh } = useSession();
  // Read the token exactly once across re-renders and StrictMode double
  // renders: the second call would see an already-cleared fragment.
  const tokenRef = useRef<string | null>(null);
  if (tokenRef.current === null) tokenRef.current = consumeRecoveryToken();
  const token = tokenRef.current;
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || done || password !== confirmation) return;
    setBusy(true);
    setError(null);
    try {
      if (recovery) {
        const csrf = await apiFetch<{ login_csrf_token: string }>("/api/auth/login-csrf");
        await apiFetch("/api/auth/set-password", {
          method: "POST",
          body: { token, password, login_csrf: csrf.login_csrf_token },
        });
      } else {
        await apiFetch("/api/auth/password", {
          method: "POST",
          body: { current_password: current, password },
        });
      }
      setDone(true);
      if (!recovery) {
        // Every session of this account was revoked server-side; refreshing
        // flips the session context and returns the user to the sign-in page.
        void refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("account.changeFailed"));
    } finally {
      setCurrent(""); setPassword(""); setConfirmation(""); setBusy(false);
    }
  }

  const mismatch = confirmation !== "" && password !== confirmation;
  return <section className="panel">
    <LanguageSwitcher />
    <h1>{t(recovery ? "account.setPassword" : "account.changePassword")}</h1>
    {done ? <><p role="status">{t("account.passwordSaved")}</p><Link to="/login" onClick={() => void refresh()}>{t("account.signInAgain")}</Link></> : <>
      <p>{t(recovery ? "account.linkHint" : "account.changeHint")}</p>
      {recovery && !token && <p role="alert">{t("account.linkMissing")}</p>}
      {error && <p role="alert">{localizeAppText(error)}</p>}
      <form onSubmit={(event) => void submit(event)}>
        <fieldset disabled={busy || (recovery && !token)} className="form-grid">
          {!recovery && <label>{t("account.currentPassword")}<input className="text-input" type="password" required maxLength={128} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></label>}
          <label>{t("account.newPassword")}<input className="text-input" type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <label>{t("account.confirmPassword")}<input className="text-input" type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label>
          {mismatch && <p role="alert">{t("account.mismatch")}</p>}
          <button className="button button--primary" disabled={busy || mismatch || password === "" || (recovery && !token)}>{t("account.savePassword")}</button>
        </fieldset>
      </form>
    </>}
  </section>;
}

/** One-time display of an activation or recovery link for an administrator.
 * The value never persists in app state beyond this component's lifetime;
 * copy support avoids the link landing in screenshots of the address bar. */
export function PasswordLink({ url }: { url: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const absolute = new URL(url, window.location.origin).href;

  async function copy() {
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be unavailable; the readonly field below stays
      // selectable as the fallback.
    }
  }

  return <div role="status" className="password-link">
    <p>{t("account.shareLink")}</p>
    <div className="password-link__row">
      <input className="text-input mono" aria-label={t("account.link")} readOnly value={absolute} onFocus={(event) => event.currentTarget.select()} />
      <button type="button" className="button button--secondary button--small" onClick={() => void copy()}>{copied ? t("account.copied") : t("account.copy")}</button>
    </div>
  </div>;
}
