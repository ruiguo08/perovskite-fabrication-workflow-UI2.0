import { localizeAppText } from "../i18n";
import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useState, type ReactNode, type SyntheticEvent } from "react";
import { apiFetch } from "../lib/api";
import { formatDateTime } from "../lib/format";

export interface VersionRecord {
  id: number;
  revision_number: number;
  canonical_hash: string;
  created_by_id: number | null;
  created_at: string;
  preset_schema_version?: number;
  recipe_schema_version?: number;
}

interface VersionHistoryProps<T extends VersionRecord> {
  endpoint: string;
  renderSnapshot?: (version: T) => ReactNode;
}

export function VersionHistory<T extends VersionRecord>({
  endpoint,
  renderSnapshot,
}: VersionHistoryProps<T>) {
  useUiLanguage();
  const [versions, setVersions] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setVersions(await apiFetch<T[]>(endpoint));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load version history.");
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    if (event.currentTarget.open && versions === null && !loading) {
      void load();
    }
  }

  return (
    <details className="version-history" onToggle={handleToggle}>
      <summary>{tr("versionHistory.versionHistory")}</summary>
      <div className="version-history__body">
        {loading ? <p role="status">{tr("versionHistory.loadingVersions")}</p> : null}
        {error ? (
          <div className="inline-form-error" role="alert">
            {localizeAppText(error ?? "")}{" "}
            <button className="button button--secondary button--small" type="button" onClick={() => void load()}>{tr("versionHistory.retry")}</button>
          </div>
        ) : null}
        {versions?.length === 0 ? <p className="table-empty">{tr("versionHistory.noRevisionsAreAvailable")}</p> : null}
        {versions ? (
          <ol className="version-list">
            {versions.map((version) => {
              const schema = version.preset_schema_version ?? version.recipe_schema_version;
              return (
                <li key={version.id} className="version-list__item">
                  <div className="version-list__heading">
                    <strong>{tr("versionHistory.revision")}{version.revision_number}</strong>
                    <span>{tr("conditionCard.schema")}{schema ?? "—"}</span>
                    <span>{tr("versionHistory.actor")}{version.created_by_id ?? tr("versionHistory.system")}</span>
                    <time dateTime={version.created_at}>{formatDateTime(version.created_at)}</time>
                  </div>
                  <code className="version-list__hash">{version.canonical_hash}</code>
                  {renderSnapshot ? (
                    <details className="snapshot-disclosure">
                      <summary>{tr("versionHistory.inspectSnapshot")}</summary>
                      {renderSnapshot(version)}
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </details>
  );
}
