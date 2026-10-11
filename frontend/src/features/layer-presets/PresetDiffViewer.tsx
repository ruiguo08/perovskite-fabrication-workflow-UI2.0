import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { apiFetch } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { LayerPreset, LayerPresetVersion } from "../../types/api";
import {
  diffPresetSnapshots,
  formatDiffValue,
  type PresetDiffEntry,
  type PresetDiffGroupKey,
} from "./presetDiff";

const DIFF_GROUPS: { key: PresetDiffGroupKey; title: string }[] = [
  { key: "identity", title: "Identity" },
  { key: "solution", title: "Solution formulation" },
  { key: "layerProcess", title: "Layer process" },
  { key: "depositionProcess", title: "Perovskite deposition process" },
];

const KIND_MARKS: Record<PresetDiffEntry["kind"], { mark: string; label: string }> = {
  added: { mark: "+", label: "added" },
  removed: { mark: "−", label: "removed" },
  changed: { mark: "≠", label: "changed" },
};

/**
 * Compare the content of any two revisions that are visible to the current
 * user. This is a preset-specific viewer: the shared VersionHistory component
 * keeps its existing behavior. Revisions store no historical name or change
 * reason, so none is shown.
 *
 * The loaded revision list is tied to the preset's current_version_id: saving
 * a new revision invalidates the cache and refetches, and an in-flight
 * request for an older version can never overwrite a newer result.
 */
export function PresetDiffViewer({ preset }: { preset: LayerPreset }) {
  const [versions, setVersions] = useState<LayerPresetVersion[] | null>(null);
  const [loadedForVersionId, setLoadedForVersionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftId, setLeftId] = useState<number | null>(null);
  const [rightId, setRightId] = useState<number | null>(null);
  const requestId = useRef(0);
  const userAdjusted = useRef(false);
  const everOpened = useRef(false);

  async function load() {
    const activeRequest = ++requestId.current;
    const targetVersionId = preset.current_version_id;
    setLoading(true);
    setError(null);
    try {
      const loaded = await apiFetch<LayerPresetVersion[]>(`/api/layer-presets/${preset.id}/versions`);
      if (requestId.current !== activeRequest) {
        return;
      }
      setVersions(loaded);
      setLoadedForVersionId(targetVersionId);
      // Keep an explicit user selection when both revisions still exist;
      // otherwise (including after the list simply grows past the single-
      // revision placeholder) default to newest vs its predecessor.
      const stillSelectable = (id: number | null) => id !== null && loaded.some((version) => version.id === id);
      if (!userAdjusted.current || !stillSelectable(leftId) || !stillSelectable(rightId)) {
        if (loaded.length >= 2) {
          setLeftId(loaded[loaded.length - 2].id);
          setRightId(loaded[loaded.length - 1].id);
        } else if (loaded.length === 1) {
          setLeftId(loaded[0].id);
          setRightId(loaded[0].id);
        }
      }
    } catch (caught) {
      if (requestId.current !== activeRequest) {
        return;
      }
      setError(caught instanceof Error ? caught.message : "Unable to load preset revisions.");
    } finally {
      if (requestId.current === activeRequest) {
        setLoading(false);
      }
    }
  }

  // A revision saved after the panel was opened at least once refreshes the
  // cached list — even while an earlier request is still in flight (that
  // stale response is discarded by the request-id guard above).
  useEffect(() => {
    if (everOpened.current && loadedForVersionId !== preset.current_version_id) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedForVersionId, preset.current_version_id]);

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    if (event.currentTarget.open) {
      everOpened.current = true;
      if (versions === null && !loading) {
        void load();
      }
    }
  }

  const ordered = versions ?? [];
  const left = ordered.find((version) => version.id === leftId) ?? null;
  const right = ordered.find((version) => version.id === rightId) ?? null;
  const result = left && right
    ? diffPresetSnapshots(
        { layer: left.layer, deposition_process: left.deposition_process },
        { layer: right.layer, deposition_process: right.deposition_process },
      )
    : null;

  return (
    <details className="preset-diff" onToggle={handleToggle}>
      <summary>Compare revisions</summary>
      <div className="preset-diff__body">
        {loading ? <p role="status">Loading revisions…</p> : null}
        {error ? (
          <div className="inline-form-error" role="alert">
            {error}{" "}
            <button className="button button--secondary button--small" type="button" onClick={() => void load()}>Retry</button>
          </div>
        ) : null}
        {ordered.length === 1 ? (
          <p className="builder-help">Only one revision exists for this preset, so there is nothing to compare yet. The comparison becomes available after the next saved revision.</p>
        ) : null}
        {ordered.length >= 2 ? (
          <>
            <div className="preset-diff__pickers">
              <label className="builder-field">
                <span>Older revision</span>
                <select
                  className="text-input"
                  aria-label={`Older revision to compare for ${preset.name}`}
                  value={leftId ?? ""}
                  onChange={(event) => {
                    userAdjusted.current = true;
                    setLeftId(Number(event.target.value));
                  }}
                >
                  {ordered.map((version) => (
                    <option key={version.id} value={version.id}>r{version.revision_number} · {formatDateTime(version.created_at)}</option>
                  ))}
                </select>
              </label>
              <label className="builder-field">
                <span>Newer revision</span>
                <select
                  className="text-input"
                  aria-label={`Newer revision to compare for ${preset.name}`}
                  value={rightId ?? ""}
                  onChange={(event) => {
                    userAdjusted.current = true;
                    setRightId(Number(event.target.value));
                  }}
                >
                  {ordered.map((version) => (
                    <option key={version.id} value={version.id}>r{version.revision_number} · {formatDateTime(version.created_at)}</option>
                  ))}
                </select>
              </label>
            </div>
            {left && right ? (
              <p className="builder-help preset-diff__meta">
                Comparing r{left.revision_number} ({formatDateTime(left.created_at)}, actor {left.created_by_id ?? "system"}) with r{right.revision_number} ({formatDateTime(right.created_at)}, actor {right.created_by_id ?? "system"}).
              </p>
            ) : null}
            {result?.identical ? (
              <p className="builder-help" role="status">
                Revisions r{left?.revision_number} and r{right?.revision_number} have identical content.
              </p>
            ) : null}
            {result && !result.identical
              ? DIFF_GROUPS.map((group) => {
                  const entries = result.entries.filter((entry) => entry.group === group.key);
                  if (entries.length === 0) {
                    return null;
                  }
                  return (
                    <div className="preset-diff__group" key={group.key}>
                      <h4>{group.title}</h4>
                      <ul className="preset-diff__list">
                        {entries.map((entry) => (
                          <DiffRow key={entry.path} entry={entry} />
                        ))}
                      </ul>
                    </div>
                  );
                })
              : null}
          </>
        ) : null}
      </div>
    </details>
  );
}

function DiffRow({ entry }: { entry: PresetDiffEntry }) {
  const kind = KIND_MARKS[entry.kind];
  return (
    <li className={`preset-diff__row preset-diff__row--${entry.kind}`}>
      <span className="preset-diff__mark" aria-label={kind.label}>{kind.mark}</span>
      <span className="preset-diff__label">{entry.label} <code>{entry.path}</code></span>
      <span className="preset-diff__values">
        {entry.kind === "changed" ? (
          <>
            <span className="preset-diff__value preset-diff__value--left">{formatDiffValue(entry.left, entry.path)}</span>
            <span className="preset-diff__arrow" aria-hidden="true">→</span>
            <span className="preset-diff__value preset-diff__value--right">{formatDiffValue(entry.right, entry.path)}</span>
          </>
        ) : entry.kind === "added" ? (
          <span className="preset-diff__value preset-diff__value--right">{formatDiffValue(entry.right, entry.path)}</span>
        ) : (
          <span className="preset-diff__value preset-diff__value--left">{formatDiffValue(entry.left, entry.path)}</span>
        )}
      </span>
    </li>
  );
}
