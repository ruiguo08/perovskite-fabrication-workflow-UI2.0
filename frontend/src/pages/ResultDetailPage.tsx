import { localizeAppText } from "../i18n";
import { useMemo } from "react";
import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { DeviceExclusionsPanel } from "../components/DeviceExclusionsPanel";
import { ErrorState } from "../components/ErrorState";
import { InlineFormError } from "../components/InlineFormError";
import { JvChart } from "../components/JvChart";
import { PublicationFigure, type FigureColorScale } from "../components/PublicationFigure";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../components/Toast";
import { apiFetch } from "../lib/api";
import { formatDateTime, formatNumber, scaleMetric } from "../lib/format";
import { bestTrace, directionalMetric } from "../lib/deviceMetrics";
import { directionalGroupStatistics } from "../lib/resultStatistics";
import type { ExclusionThresholds } from "../lib/deviceExclusionRules";
import { DeviceScanHistoryPanel } from "../components/DeviceScanHistoryPanel";
import { useApiResource } from "../lib/useApiResource";
import type {
  AnalysisDevice,
  AnalysisStatistics,
  ParsedAnalysis,
  ResultDetail,
  ResultAssignment,
  ResultAssignmentGroup,
} from "../types/api";

const METRIC_META: { name: "voc" | "jsc" | "ff" | "pce"; label: string }[] = [
  { name: "voc", label: "Voc (V)" },
  { name: "jsc", label: "Jsc (mA cm⁻²)" },
  { name: "ff", label: "FF (%)" },
  { name: "pce", label: "PCE (%)" },
];

type ResultSection = "assignments" | "statistics" | "jv" | "uniformity" | "records";
const CATEGORICAL_PALETTES = [
  ["nature-classic", "Nature Classic"], ["science-tol", "Science / Paul Tol"],
  ["lancet-clinical", "Lancet Clinical"], ["nejm", "NEJM Palette"],
] as const;
const GRADIENT_PALETTES = [
  ["rdylgn", "RdYlGn"], ["nature-warm", "Nature warm"],
  ["science-purple", "Science deep purple"], ["lancet-blue", "Lancet deep blue"],
  ["nejm-red", "NEJM medical red"], ["cell-blue", "Cell blue-dominant"],
  ["wong-orange", "Wong bright orange"], ["viridis", "Viridis"],
  ["red-blue", "Diverging red-blue"], ["medical-gray", "Medical grayscale"],
  ["rainbow", "Rainbow red-to-blue"],
] as const;

function changedEntries<K, V>(draft: Map<K, V>, saved: Map<K, V>): number {
  return [...new Set([...draft.keys(), ...saved.keys()])]
    .filter((key) => draft.get(key) !== saved.get(key)).length;
}

function FigureScopePair({ resultId, kind, metric, direction, excludedDeviceIds, revision, alt, palette, scale, filteredPreview }: {
  resultId: number;
  kind: "uniformity" | "boxplot";
  metric: "voc" | "jsc" | "ff" | "pce";
  direction?: "forward" | "reverse";
  excludedDeviceIds: string[];
  revision: number;
  alt: string;
  palette: string;
  scale?: FigureColorScale;
  filteredPreview?: boolean;
}) {
  useUiLanguage();
  return <div className="figure-scope-pair">
    {([
      { label: tr("resultDetailPage.allDevices"), excludedIds: [] },
      { label: tr("resultDetailPage.excludeFlaggedDevicesN", { "n": excludedDeviceIds.length }), excludedIds: excludedDeviceIds },
    ]).map(({ label, excludedIds }, index) =>
      <div key={index} className="figure-scope-pair__item" role="group" aria-label={localizeAppText(label)}>
        <h3>{localizeAppText(label)}{index === 1 && filteredPreview ? <span className="analysis-preview-label">{tr("resultDetailPage.unsavedPreview")}</span> : null}</h3>
        <PublicationFigure resultId={resultId} kind={kind} metric={metric} direction={direction}
          excludedDeviceIds={excludedIds} revision={revision} palette={palette} scale={scale}
          flaggedDeviceIds={kind === "uniformity" && index === 0 ? excludedDeviceIds : []}
          downloadEnabled={index === 0 || !filteredPreview} alt={`${alt} · ${localizeAppText(label)}`} />
      </div>)}
  </div>;
}

function isStatistics(value: unknown): value is AnalysisStatistics {
  return typeof value === "object" && value !== null && "groups" in value && Array.isArray((value as { groups: unknown[] }).groups);
}

function isParsedAnalysis(value: unknown): value is ParsedAnalysis {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const devices = candidate.devices;
  const substrates = candidate.substrates;
  if (!Array.isArray(devices) || !Array.isArray(substrates)) return false;
  // Every device must carry the nested fields the rendering layer accesses
  // (substrate_id, device_id, traces array); every trace in the array must
  // be an object with trace_id; every substrate must carry substrate_id,
  // device_ids, and instrument_labels.
  for (const device of devices) {
    if (
      typeof device !== "object" ||
      device === null ||
      typeof (device as Record<string, unknown>).substrate_id !== "string" ||
      typeof (device as Record<string, unknown>).device_id !== "string" ||
      !Array.isArray((device as Record<string, unknown>).traces)
    ) {
      return false;
    }
    for (const trace of (device as Record<string, unknown>).traces as unknown[]) {
      if (
        typeof trace !== "object" ||
        trace === null ||
        typeof (trace as Record<string, unknown>).trace_id !== "string"
      ) {
        return false;
      }
    }
  }
  for (const substrate of substrates) {
    if (
      typeof substrate !== "object" ||
      substrate === null ||
      typeof (substrate as Record<string, unknown>).substrate_id !== "string" ||
      !Array.isArray((substrate as Record<string, unknown>).device_ids) ||
      !Array.isArray((substrate as Record<string, unknown>).instrument_labels)
    ) {
      return false;
    }
  }
  return true;
}

interface SubstrateRow {
  substrate_id: string;
  device_ids: string[];
  instrument_labels: string[];
  group_id: string;
  batch_condition_id?: number;
}

function substrateList(analysis: ParsedAnalysis | null | undefined): SubstrateRow[] {
  if (!analysis) {
    return [];
  }
  return (analysis.substrates ?? []) as SubstrateRow[];
}

interface AssignmentFormProps {
  substrates: SubstrateRow[];
  assignments: Map<string, number>;
  groups: ResultAssignmentGroup[];
  inconsistent: Set<string>;
  submitting: boolean;
  error: string | null;
  allAssigned: boolean;
  hasSavedAssignments: boolean;
  assignmentChangeCount: number;
  correctionReason: string;
  onCorrectionReasonChange: (value: string) => void;
  onAssign: (substrateId: string, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function AssignmentForm({
  substrates,
  assignments,
  groups,
  inconsistent,
  submitting,
  error,
  allAssigned,
  hasSavedAssignments,
  assignmentChangeCount,
  correctionReason,
  onCorrectionReasonChange,
  onAssign,
  onSubmit,
}: AssignmentFormProps) {
  useUiLanguage();
  return (
    <form id="result-assignment-form" className="assignment-form" onSubmit={onSubmit}>
      {substrates.map((substrate) => (
        <div className="assignment-row" key={substrate.substrate_id}>
          <label className="form-field">
            <span className="form-field__label">{substrate.substrate_id}</span>
            <select
              className="text-input"
              aria-label={tr("resultDetailPage.assignSubstrateIdTo", { "substrate_id": substrate.substrate_id })}
              value={assignments.get(substrate.substrate_id) ?? ""}
              onChange={(event) => onAssign(substrate.substrate_id, event.target.value)}
            >
              <option value="">{tr("resultDetailPage.chooseACondition")}</option>
              {groups.map((group) => (
                <option key={group.batch_condition_id} value={group.batch_condition_id}>
                  {group.name} ({group.kind})
                </option>
              ))}
            </select>
          </label>
          {inconsistent.has(substrate.substrate_id) ? (
            <p className="inline-form-error" role="alert">
              {tr("resultDetailPage.inconsistentConditionAssignmentTheDeviceRowsForThisSubstrate")}</p>
          ) : null}
        </div>
      ))}
      {hasSavedAssignments && assignmentChangeCount > 0 ? <label className="form-field">
        <span className="form-field__label">{tr("resultDetailPage.correctionReason")}</span>
        <input className="text-input" aria-label={tr("resultDetailPage.assignmentCorrectionReason")} required maxLength={500}
          value={correctionReason} onChange={(event) => onCorrectionReasonChange(event.target.value)} />
      </label> : null}
      <button className="button button--primary assignment-form__save" type="submit" disabled={!allAssigned || submitting}>
        {submitting ? tr("runSheetTable.saving") : tr("resultDetailPage.saveAssignments")}
      </button>
      <InlineFormError message={localizeAppText(error ?? "")} />
    </form>
  );
}

interface DeviceInspectionTableProps {
  devices: AnalysisDevice[];
  groups: ResultAssignmentGroup[];
}

function DeviceInspectionTable({ devices, groups }: DeviceInspectionTableProps) {
  useUiLanguage();
  const groupNames = useMemo(
    () => new Map(groups.map((group) => [group.group_id, group.name])),
    [groups],
  );
  return (
    <section className="panel" aria-labelledby="device-inspection-title" data-device-inspection="true">
      <div className="panel__heading">
        <h2 className="panel__title" id="device-inspection-title">{tr("resultDetailPage.parsedDevices")}</h2>
        <span className="record-count">{devices.length} {tr("jvChart.devices")}</span>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>{tr("deviceExclusionsPanel.device")}</th>
              <th>{tr("deviceExclusionsPanel.substrate")}</th>
              <th>{tr("deviceExclusionsPanel.group")}</th>
              <th>{tr("resultDetailPage.traces")}</th>
              <th>{tr("jvChart.scan")}</th>
              <th>Voc</th>
              <th>Jsc</th>
              <th>FF</th>
              <th>PCE</th>
            </tr>
          </thead>
          <tbody>
            {devices.flatMap((device) => (["forward", "reverse"] as const).map((direction) => {
              const validCount = device.traces.filter((trace) => trace.valid).length;
              return (
                <tr key={`${device.device_id}-${direction}`}>
                  <td>{device.device_id}</td>
                  <td>{device.substrate_id}</td>
                  <td>{groupNames.get(device.group_id) || tr("deviceExclusionsPanel.unassigned")}</td>
                  <td>
                    {device.traces.map((trace) => (
                      <span key={trace.trace_id} className={`status-badge ${trace.valid ? "status-badge--success" : "status-badge--danger"}`}>
                        {trace.direction} {trace.valid ? "valid" : "invalid"}
                      </span>
                    ))}
                    {validCount === 0 ? <span className="status-badge status-badge--danger">{tr("resultDetailPage.noValidTrace")}</span> : null}
                  </td>
                  <td>{direction === "forward" ? tr("deviceScanHistoryPanel.forward") : tr("deviceScanHistoryPanel.reverse")}</td>
                  <td>{formatNumber(directionalMetric(device.metrics, direction, "voc"), 3)}</td>
                  <td>{formatNumber(directionalMetric(device.metrics, direction, "jsc"), 2)}</td>
                  <td>{formatNumber(scaleMetric("ff", directionalMetric(device.metrics, direction, "ff")), 2)}</td>
                  <td>{formatNumber(directionalMetric(device.metrics, direction, "pce"), 2)}</td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface ProvenanceTableProps {
  rows: ResultAssignment[];
}

function ProvenanceTable({ rows }: ProvenanceTableProps) {
  useUiLanguage();
  if (rows.length === 0) {
    return <p className="run-sheet-muted">{tr("resultDetailPage.noSavedAssignmentProvenanceRows")}</p>;
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>{tr("resultDetailPage.analysisDevice")}</th>
            <th>{tr("resultDetailPage.analysisSubstrate")}</th>
            <th>{tr("resultDetailPage.instrumentLabel")}</th>
            <th>{tr("resultDetailPage.fabricationDevice")}</th>
            <th>{tr("deviceExclusionsPanel.substrate")}</th>
            <th>{tr("campaignAnalysisPanel.condition")}</th>
            <th>{tr("resultDetailPage.batchCondition")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.analysis_device_id}</td>
              <td>{row.analysis_substrate_id}</td>
              <td>{row.instrument_label}</td>
              <td>{row.device_code ?? row.device_mark ?? "—"}</td>
              <td>{row.substrate_code ?? row.substrate_mark ?? "—"}</td>
              <td>{row.condition_code} ({row.condition_name})</td>
              <td>{row.batch_condition_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultDetailPage() {
  useUiLanguage();
  const { resultId } = useParams();
  const resultIdNumber = Number(resultId);
  const { show } = useToast();
  const loadDetail = useCallback(
    () => apiFetch<ResultDetail>(`/api/results/${resultIdNumber}`),
    [resultIdNumber],
  );
  const resource = useApiResource(loadDetail, { resetOnLoaderChange: true });
  const serverDetail = resource.data;
  const [localDetail, setLocalDetail] = useState<ResultDetail | null>(null);
  const [assignments, setAssignments] = useState<Map<string, number>>(new Map());
  const [figureRevision, setFigureRevision] = useState(0);
  const [inconsistent, setInconsistent] = useState<Set<string>>(new Set());
  const [exclusions, setExclusions] = useState<Map<string, string>>(new Map());
  const [correctionReason, setCorrectionReason] = useState("");
  const [automaticExclusions, setAutomaticExclusions] = useState<Map<string, string>>(new Map());
  const [activeThresholds, setActiveThresholds] = useState<ExclusionThresholds | null>(null);
  const [uniformityMetric, setUniformityMetric] = useState<"voc" | "jsc" | "ff" | "pce">("pce");
  const [distributionMetric, setDistributionMetric] = useState<"voc" | "jsc" | "ff" | "pce">("pce");
  const [uniformityDirection, setUniformityDirection] = useState<"forward" | "reverse">("forward");
  const [uniformityPalette, setUniformityPalette] = useState("rdylgn");
  const [distributionPalette, setDistributionPalette] = useState("nature-classic");
  const [uniformityScaleDraft, setUniformityScaleDraft] = useState({ minimum: "", maximum: "", threshold: "" });
  const [uniformityScale, setUniformityScale] = useState<FigureColorScale>({});
  const [uniformityScaleError, setUniformityScaleError] = useState<string | null>(null);
  const [assignmentExpanded, setAssignmentExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState<ResultSection>("assignments");
  const [jvVisited, setJvVisited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detail = localDetail ?? serverDetail;
  // Only render a detail whose id matches the current route; a stale detail from
  // a previous result route is never shown or used for mutations.
  const activeDetail = detail && detail.id === resultIdNumber ? detail : null;

  // Route-generation guard: invalidate the previous result during the synchronous
  // commit phase (useLayoutEffect) and on unmount (cleanup runs synchronously
  // before any Promise microtask), so an old-route assignment response cannot
  // update a new route or show a stale toast after leaving.
  const routeGeneration = useRef(0);
  // The detail object the assignment/exclusion prefill last applied to; the
  // prefill effect must run once per loaded detail and never re-run later
  // (a late re-run under load would wipe edits made in between).
  const prefilledDetailRef = useRef<unknown>(null);
  const routeKey = `${resultIdNumber}`;
  useLayoutEffect(() => {
    routeGeneration.current += 1;
    prefilledDetailRef.current = null;
    setLocalDetail(null);
    setAssignments(new Map());
    setInconsistent(new Set());
    setExclusions(new Map());
    setCorrectionReason("");
    setAutomaticExclusions(new Map());
    setActiveThresholds(null);
    setUniformityMetric("pce");
    setDistributionMetric("pce");
    setUniformityDirection("forward");
    setUniformityScaleDraft({ minimum: "", maximum: "", threshold: "" });
    setUniformityScale({});
    setUniformityScaleError(null);
    setAssignmentExpanded(true);
    setActiveSection("assignments");
    setJvVisited(false);
    setSubmitting(false);
    setError(null);
    return () => {
      routeGeneration.current += 1;
    };
  }, [routeKey]);

  const isCurrentGeneration = useCallback(
    (generation: number) => routeGeneration.current === generation,
    [],
  );

  const analysis = useMemo<ParsedAnalysis | null>(() => {
    if (!activeDetail) {
      return null;
    }
    const raw = activeDetail.analysis;
    return isParsedAnalysis(raw) ? (raw as ParsedAnalysis) : null;
  }, [activeDetail]);

  const substrates = useMemo(() => substrateList(analysis), [analysis]);
  const devices = useMemo<AnalysisDevice[]>(() => analysis?.devices ?? [], [analysis]);
  // Schema 7: no aggregate summaries are stored — the page-level numbers are
  // derived from the per-trace records (the file's best scan per direction).
  const allTraces = useMemo(() => devices.flatMap((device) => device.traces ?? []), [devices]);
  const validTraceCount = allTraces.filter((trace) => trace.valid).length;
  const bestForwardTrace = useMemo(() => bestTrace(allTraces, "forward"), [allTraces]);
  const bestReverseTrace = useMemo(() => bestTrace(allTraces, "reverse"), [allTraces]);
  const statistics = useMemo<AnalysisStatistics | null>(() => {
    if (!analysis) {
      return null;
    }
    return isStatistics(analysis.statistics) ? analysis.statistics : null;
  }, [analysis]);
  const analysisWarnings = useMemo<string[]>(() => {
    const raw = analysis?.warnings;
    return Array.isArray(raw)
      ? raw.filter((item): item is string => typeof item === "string")
      : [];
  }, [analysis]);
  const groups = useMemo<ResultAssignmentGroup[]>(() => activeDetail?.groups ?? [], [activeDetail]);
  const effectiveExclusions = useMemo(() => new Map([...automaticExclusions, ...exclusions]), [automaticExclusions, exclusions]);
  const directionalStatistics = useMemo(
    () => directionalGroupStatistics(devices, groups, new Set(effectiveExclusions.keys())),
    [devices, groups, effectiveExclusions],
  );
  const savedAssignments = useMemo(() => new Map(substrates
    .filter((substrate) => substrate.batch_condition_id !== undefined)
    .map((substrate) => [substrate.substrate_id, substrate.batch_condition_id!] as const)), [substrates]);
  const savedExclusions = useMemo(() => new Map(devices
    .filter((device) => device.excluded)
    .map((device) => [device.device_id, device.exclusion_reason ?? ""] as const)), [devices]);
  const assignmentChangeCount = changedEntries(assignments, savedAssignments);
  const exclusionChangeCount = changedEntries(exclusions, savedExclusions);
  const draftDirty = prefilledDetailRef.current === activeDetail &&
    (assignmentChangeCount > 0 || exclusionChangeCount > 0);

  useEffect(() => {
    if (!draftDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [draftDirty]);
  // Saved assignment provenance comes straight from the detail response, which
  // the backend builds with the same rows as GET /api/results/{id}/assignments.
  // Using it directly removes a same-route GET/POST race where a stale secondary
  // GET could overwrite rows just written by a fresh save; the post-save handler
  // updates localDetail so this stays current without an extra round-trip.
  const effectiveProvenance = useMemo<ResultAssignment[]>(
    () => activeDetail?.assignments ?? [],
    [activeDetail],
  );

  // Detect device-row inconsistency from the effective provenance rows.
  useEffect(() => {
    if (effectiveProvenance.length === 0) {
      setInconsistent(new Set());
      return;
    }
    const bySubstrate = new Map<string, Set<number>>();
    for (const row of effectiveProvenance) {
      const set = bySubstrate.get(row.analysis_substrate_id) ?? new Set<number>();
      set.add(row.batch_condition_id);
      bySubstrate.set(row.analysis_substrate_id, set);
    }
    const bad = new Set<string>();
    for (const [substrateId, conditionIds] of bySubstrate) {
      if (conditionIds.size > 1) {
        bad.add(substrateId);
        continue;
      }
      const substrateRow = substrates.find((s) => s.substrate_id === substrateId);
      if (substrateRow?.batch_condition_id !== undefined) {
        const only = Array.from(conditionIds)[0];
        if (only !== substrateRow.batch_condition_id) {
          bad.add(substrateId);
        }
      }
    }
    setInconsistent(bad);
  }, [effectiveProvenance, substrates]);

  // Preselect from analysis.substrates[].batch_condition_id only, and restore
  // any saved device exclusions so a re-save keeps them until cleared. The
  // ref guard applies this once per loaded detail; a later re-run (new Map
  // identities are irrelevant) would otherwise reset user edits mid-session.
  useEffect(() => {
    if (!activeDetail || prefilledDetailRef.current === activeDetail) {
      return;
    }
    const firstLoad = prefilledDetailRef.current === null;
    prefilledDetailRef.current = activeDetail;
    const next = new Map<string, number>();
    for (const substrate of substrates) {
      if (substrate.batch_condition_id !== undefined) {
        next.set(substrate.substrate_id, substrate.batch_condition_id);
      }
    }
    setAssignments(next);
    const savedExclusions = new Map<string, string>();
    for (const device of devices) {
      if (device.excluded) {
        savedExclusions.set(device.device_id, device.exclusion_reason ?? "");
      }
    }
    setExclusions(savedExclusions);
    if (firstLoad) {
      const hasSavedStatistics = isStatistics(activeDetail.analysis.statistics);
      setAssignmentExpanded(!hasSavedStatistics);
      setActiveSection("assignments");
    }
  }, [activeDetail, substrates, devices]);

  const allAssigned = substrates.length > 0 && substrates.every((s) => assignments.has(s.substrate_id));

  function handleAssign(substrateId: string, value: string) {
    setAssignments((current) => {
      const next = new Map(current);
      if (value === "") {
        next.delete(substrateId);
      } else {
        next.set(substrateId, Number(value));
      }
      return next;
    });
  }

  function discardChanges() {
    setAssignments(new Map(savedAssignments));
    setExclusions(new Map(savedExclusions));
    setCorrectionReason("");
    setError(null);
  }

  function applyUniformityScale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parse = (value: string) => value.trim() === "" ? undefined : Number(value);
    const minimum = parse(uniformityScaleDraft.minimum);
    const maximum = parse(uniformityScaleDraft.maximum);
    const threshold = parse(uniformityScaleDraft.threshold);
    if ([minimum, maximum, threshold].some((value) => value !== undefined && !Number.isFinite(value))) {
      setUniformityScaleError("Enter finite numeric values for the color range.");
      return;
    }
    if ((minimum === undefined) !== (maximum === undefined)) {
      setUniformityScaleError("Enter both a minimum and maximum, or leave both blank for the automatic range.");
      return;
    }
    if (minimum !== undefined && maximum !== undefined && minimum >= maximum) {
      setUniformityScaleError("The color bar minimum must be lower than its maximum.");
      return;
    }
    if (threshold !== undefined && minimum !== undefined && maximum !== undefined &&
        (threshold <= minimum || threshold >= maximum)) {
      setUniformityScaleError("The problem threshold must be inside the color bar range.");
      return;
    }
    setUniformityScale({ minimum, maximum, threshold });
    setUniformityScaleError(null);
  }

  function resetUniformityScale() {
    setUniformityScaleDraft({ minimum: "", maximum: "", threshold: "" });
    setUniformityScale({});
    setUniformityScaleError(null);
  }

  async function saveAnalysis(mode: "assignments" | "manual") {
    if (!activeDetail) {
      return;
    }
    if (mode === "assignments" && savedAssignments.size && assignmentChangeCount > 0 && !correctionReason.trim()) {
      setError("Enter a correction reason before changing saved assignments.");
      return;
    }
    const generation = routeGeneration.current;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        assignments: substrates.map((s) => ({
          analysis_substrate_id: s.substrate_id,
          batch_condition_id: (mode === "assignments" ? assignments : savedAssignments).get(s.substrate_id)!,
        })),
        exclusions: [...(mode === "manual" ? exclusions : savedExclusions).entries()].map(([analysis_device_id, reason]) => ({
          analysis_device_id,
          reason: reason.trim() || "flagged as an outlier",
        })),
        correction_reason: mode === "assignments" && savedAssignments.size ? correctionReason.trim() : undefined,
      };
      const updated = await apiFetch<ResultDetail>(
        `/api/results/${resultIdNumber}/assignments`,
        { method: "POST", body: payload },
      );
      if (!isCurrentGeneration(generation)) {
        return;
      }
      // Replace local state with the complete returned ResultDetailResponse.
      const savedAnalysis = isParsedAnalysis(updated?.analysis) ? updated.analysis : null;
      if (savedAnalysis && mode === "manual") {
        setExclusions(new Map(savedAnalysis.devices
          .filter((device) => device.excluded)
          .map((device) => [device.device_id, device.exclusion_reason ?? ""] as const)));
      }
      if (savedAnalysis && mode === "assignments") {
        setAssignments(new Map(savedAnalysis.substrates
          .filter((substrate) => substrate.batch_condition_id !== undefined)
          .map((substrate) => [substrate.substrate_id, substrate.batch_condition_id!] as const)));
      }
      prefilledDetailRef.current = updated;
      setLocalDetail(updated);
      setFigureRevision((current) => current + 1);
      if (mode === "assignments") {
        setAssignmentExpanded(false);
        setActiveSection("statistics");
        setCorrectionReason("");
      }
      show(mode === "assignments" ? "Assignments saved. Analysis updated." : "Manual exclusions saved.", "success");
    } catch (caught) {
      if (isCurrentGeneration(generation)) {
        setError(caught instanceof Error ? caught.message : "Unable to save assignments.");
      }
    } finally {
      if (isCurrentGeneration(generation)) {
        setSubmitting(false);
      }
    }
  }

  function submitAssignments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveAnalysis("assignments");
  }

  if (!Number.isInteger(resultIdNumber) || resultIdNumber <= 0) {
    return <ErrorState title={tr("resultDetailPage.invalidResult")} message={tr("resultDetailPage.theResultIdentifierIsNotValid")} />;
  }
  if (resource.status === "loading" && activeDetail === null) {
    return <div className="page-loading" role="status">{tr("resultDetailPage.loadingResult")}</div>;
  }
  if (resource.status === "error" && activeDetail === null) {
    return (
      <ErrorState
        title={tr("resultDetailPage.unableToLoadResult")}
        message={resource.error ?? tr("resultDetailPage.theResultCouldNotBeLoaded")}
        action={
          <button type="button" className="button button--secondary" onClick={() => void resource.reload()}>
            {tr("versionHistory.retry")}</button>
        }
      />
    );
  }
  if (!activeDetail) {
    return null;
  }
  if (!analysis) {
    return (
      <div data-result-detail="true">
        <PageHeader
          title={activeDetail.filename}
          description={tr("resultDetailPage.resultFileIdContentType", { "id": activeDetail.id, "content_type": activeDetail.content_type })}
        />
        <ErrorState
          title={tr("resultDetailPage.characterizationAnalysisUnavailable")}
          message={tr("resultDetailPage.theCharacterizationAnalysisForThisResultIsNotAvailable")}
        />
      </div>
    );
  }

  const experimentId = activeDetail.experiment_id;
  const statisticsPresent = statistics !== null;

  return (
    <div data-result-detail="true">
      <PageHeader
        title={activeDetail.filename}
        description={tr("resultDetailPage.resultFileIdContentType", { "id": activeDetail.id, "content_type": activeDetail.content_type })}
        meta={tr("time.uploadedDate", { time: formatDateTime(activeDetail.created_at) })}
        actions={
          <>
            <Link className="button button--secondary" to={`/experiments/${experimentId}`}>{tr("experimentsPage.experiment")}</Link>
            <Link className="button button--secondary" to={`/experiments/${experimentId}/batches/${activeDetail.fabrication_batch_id}`}>{tr("campaignAnalysisPanel.batch")}</Link>
          </>
        }
      />
      {draftDirty ? <div className="analysis-preview-banner" role="status" aria-label={tr("resultDetailPage.unsavedAnalysisPreview")}>
        <div>
          <strong>{tr("resultDetailPage.unsavedAnalysisPreview")}</strong>
          <span>{[
            assignmentChangeCount ? `${assignmentChangeCount} assignment change${assignmentChangeCount === 1 ? "" : "s"}` : "",
            exclusionChangeCount ? `${exclusionChangeCount} exclusion change${exclusionChangeCount === 1 ? "" : "s"}` : "",
          ].filter(Boolean).join(" · ")} · {exclusionChangeCount
            ? tr("resultDetailPage.statisticsAndFilteredFiguresPreviewYourExclusionSelection")
            : tr("resultDetailPage.assignmentChangesTakeEffectAfterSaving")}{assignmentChangeCount && exclusionChangeCount
            ? tr("resultDetailPage.assignmentChangesTakeEffectAfterSaving2")
            : ""}</span>
        </div>
        <div className="button-row">
          {assignmentChangeCount > 0 ? <button className="button button--primary button--small" type="button" onClick={() => void saveAnalysis("assignments")} disabled={!allAssigned || submitting}>
            {submitting ? tr("runSheetTable.saving") : tr("resultDetailPage.applyAssignmentChanges")}
          </button> : null}
          {exclusionChangeCount > 0 ? <button className="button button--primary button--small" type="button" onClick={() => void saveAnalysis("manual")}
            disabled={savedAssignments.size !== substrates.length || submitting}>
            {submitting ? tr("runSheetTable.saving") : tr("resultDetailPage.saveManualExclusions")}
          </button> : null}
          <button className="button button--secondary button--small" type="button" onClick={discardChanges}>{tr("resultDetailPage.discardChanges")}</button>
        </div>
      </div> : null}
      {activeThresholds ? <div className="analysis-preview-banner" role="status" aria-label={tr("resultDetailPage.activeThresholdFilter")}>
        <div>
          <strong>{tr("resultDetailPage.currentAnalysisFilter")}</strong>
          <span>Voc &lt; {activeThresholds.voc ?? tr("resultDetailPage.off")} V · PCE &lt; {activeThresholds.pce ?? tr("resultDetailPage.off")}% · FF &lt; {activeThresholds.ff ?? tr("resultDetailPage.off")}% · {automaticExclusions.size} {tr("resultDetailPage.devicesMatchThresholdsAreNotSaved")}</span>
        </div>
      </div> : null}

      {analysisWarnings.length > 0 ? (
        <div className="analysis-warnings" role="alert">
          <strong>{tr("resultDetailPage.measurementQualityWarnings")}</strong>
          <ul>
            {analysisWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="stat-tiles" role="list">
        <div className="stat-tile" role="listitem">
          <span className="stat-tile__value">{substrates.length}</span>
          <span className="stat-tile__label">{tr("conditionCard.substrates")}</span>
        </div>
        <div className="stat-tile" role="listitem">
          <span className="stat-tile__value">{devices.length}</span>
          <span className="stat-tile__label">{tr("conditionCard.devices")}</span>
        </div>
        <div className="stat-tile" role="listitem">
          <span className="stat-tile__value">
            {validTraceCount || "—"}{allTraces.length ? ` / ${allTraces.length}` : ""}
          </span>
          <span className="stat-tile__label">{tr("resultDetailPage.validTraces")}</span>
        </div>
        <div className="stat-tile" role="listitem">
          <span className="stat-tile__value">
            {formatNumber(bestForwardTrace?.metrics?.pce, 2)}
          </span>
          <span className="stat-tile__label">{tr("resultDetailPage.bestForwardPCE")}</span>
        </div>
        <div className="stat-tile" role="listitem">
          <span className="stat-tile__value">{formatNumber(bestReverseTrace?.metrics?.pce, 2)}</span>
          <span className="stat-tile__label">{tr("resultDetailPage.bestReversePCE")}</span>
        </div>
      </div>

      <nav className="result-section-nav" aria-label={tr("resultDetailPage.resultSections")}>
        {([
          ["assignments", "Assignments"],
          ["statistics", "Statistics"],
          ["jv", "J–V curves"],
          ["uniformity", "Uniformity"],
          ["records", "Data & provenance"],
        ] as const).map(([section, label]) => (
          <button key={section} type="button"
            className={`result-section-nav__button${activeSection === section ? " result-section-nav__button--active" : ""}`}
            aria-pressed={activeSection === section}
            disabled={(section === "statistics" || section === "uniformity") && !statisticsPresent}
            onClick={() => {
              if (section === "jv") setJvVisited(true);
              setActiveSection(section);
            }}>
            {localizeAppText(label)}
            {section === "assignments" ? <span className="result-section-nav__count">{assignments.size}/{substrates.length}</span> : null}
          </button>
        ))}
      </nav>

      {activeSection === "records" ? <>
      <section className="panel" aria-labelledby="result-meta-title">
        <div className="panel__heading">
          <h2 className="panel__title" id="result-meta-title">{tr("resultDetailPage.integrityProvenance")}</h2>
        </div>
        <dl className="meta-grid">
          <div><dt>{tr("experimentsPage.experiment")}</dt><dd>{experimentId}</dd></div>
          <div><dt>{tr("resultDetailPage.size")}</dt><dd>{activeDetail.size_bytes} bytes</dd></div>
          <div><dt>SHA-256</dt><dd><code title={activeDetail.sha256}>{(activeDetail.sha256 ?? "").slice(0, 16)}…</code></dd></div>
          <div><dt>{tr("resultDetailPage.analysisSchema")}</dt><dd>{tr("resultDetailPage.schemaV")}{activeDetail.analysis_schema_version}</dd></div>
          <div><dt>{tr("resultDetailPage.uploadedBy")}</dt><dd>{activeDetail.created_by_id === null ? tr("resultDetailPage.notAvailable") : activeDetail.created_by_id}</dd></div>
        </dl>
      </section>
      </> : null}

      {activeSection === "assignments" ? <>
      <section className="panel" aria-labelledby="assignment-title">
        <div className="panel__heading">
          <h2 className="panel__title" id="assignment-title">{tr("resultDetailPage.substrateConditionAssignment")}</h2>
          <div className="panel__heading-actions">
            {statisticsPresent ? <span className="record-count">{statistics!.groups.length} {tr("resultDetailPage.groups")}</span> : null}
            {!assignmentExpanded ? (
              <button
                type="button"
                className="button button--secondary button--small"
                aria-expanded="false"
                onClick={() => setAssignmentExpanded(true)}
              >
                {tr("resultDetailPage.editAssignments")}</button>
            ) : null}
          </div>
        </div>
        <p className="run-sheet-muted">
          {tr("resultDetailPage.selectExactlyOneExperimentConditionForEachSubstrateName")}</p>
        {!statisticsPresent ? (
          <p className="run-sheet-muted">{tr("resultDetailPage.allSubstratesMustBeAssignedBeforeStatisticsAreCalculated")}</p>
        ) : null}
        {assignmentExpanded ? (
          <AssignmentForm
            substrates={substrates}
            assignments={assignments}
            groups={groups}
            inconsistent={inconsistent}
            submitting={submitting}
            error={localizeAppText(error ?? "")}
            allAssigned={allAssigned}
            hasSavedAssignments={savedAssignments.size > 0}
            assignmentChangeCount={assignmentChangeCount}
            correctionReason={correctionReason}
            onCorrectionReasonChange={setCorrectionReason}
            onAssign={handleAssign}
            onSubmit={submitAssignments}
          />
        ) : (
          <p className="run-sheet-muted">{tr("resultDetailPage.assignmentsSavedFor")}{substrates.length} {tr("resultDetailPage.substrates")}</p>
        )}
      </section>

      <details className="result-exclusions-details">
        <summary>{tr("resultDetailPage.deviceExclusions")}<span>{exclusions.size} {tr("jvChart.selected")}</span></summary>
        <DeviceExclusionsPanel
          devices={devices}
          groups={groups}
          exclusions={exclusions}
          automaticExclusions={automaticExclusions}
          initialThresholds={activeThresholds}
          onApplyAutomatic={(next, thresholds) => {
            setAutomaticExclusions(next);
            setActiveThresholds(Object.values(thresholds).some((value) => value !== null) ? thresholds : null);
          }}
          onChange={(next) => {
            setExclusions(next);
          }}
        />
      </details>
      </> : null}

      {activeSection === "records" ? <>
      <details className="result-collapsible">
        <summary>{tr("resultDetailPage.deviceScanHistory")}<span>{effectiveProvenance.length} {tr("resultDetailPage.assignments")}</span></summary>
      <DeviceScanHistoryPanel assignments={effectiveProvenance} />
      </details>

      <details className="result-collapsible">
        <summary>{tr("resultDetailPage.savedAssignmentProvenance")}<span>{effectiveProvenance.length} {tr("resultDetailPage.rows")}</span></summary>
      <section className="panel" aria-labelledby="provenance-title">
        <div className="panel__heading">
          <h2 className="panel__title" id="provenance-title">{tr("resultDetailPage.savedAssignmentProvenance2")}</h2>
        </div>
        <ProvenanceTable rows={effectiveProvenance} />
      </section>
      </details>
      <details className="result-collapsible">
        <summary>{tr("resultDetailPage.parsedDevices2")}<span>{devices.length} {tr("jvChart.devices")}</span></summary>
      <DeviceInspectionTable devices={devices} groups={groups} />
      </details>
      </> : null}

      {jvVisited ? <div hidden={activeSection !== "jv"}>
        <JvChart key={resultIdNumber} resultId={resultIdNumber} devices={devices} groups={groups} figureRevision={figureRevision} />
      </div> : null}
      {activeSection === "uniformity" && statisticsPresent ? (
      <section className="panel" aria-labelledby="uniformity-title">
        <div className="panel__heading">
          <h2 className="panel__title" id="uniformity-title">{tr("resultDetailPage.publicationSubstrateUniformity")}</h2>
          <label>{tr("resultDetailPage.metric")}<select className="text-input" value={uniformityMetric}
            onChange={(event) => {
              setUniformityMetric(event.target.value as typeof uniformityMetric);
              resetUniformityScale();
            }}>
            {METRIC_META.map((metric) => <option key={metric.name} value={metric.name}>{metric.label}</option>)}
          </select></label>
          <label>{tr("resultDetailPage.scanDirection")}<select className="text-input" value={uniformityDirection}
            onChange={(event) => setUniformityDirection(event.target.value as typeof uniformityDirection)}>
            <option value="forward">{tr("deviceScanHistoryPanel.forward")}</option>
            <option value="reverse">{tr("deviceScanHistoryPanel.reverse")}</option>
          </select></label>
          <label>{tr("jvChart.colorPalette")}<select className="text-input" value={uniformityPalette}
            onChange={(event) => setUniformityPalette(event.target.value)}>
            {GRADIENT_PALETTES.map(([value, label]) => <option key={value} value={value}>{localizeAppText(label)}</option>)}
          </select></label>
        </div>
        <form className="figure-scale-controls" onSubmit={applyUniformityScale}>
          <div className="figure-scale-controls__fields">
            <label>{tr("resultDetailPage.colorBarMinimum")}<input className="text-input" type="number" step="any"
              value={uniformityScaleDraft.minimum}
              onChange={(event) => setUniformityScaleDraft((current) => ({ ...current, minimum: event.target.value }))} /></label>
            <label>{tr("resultDetailPage.colorBarMaximum")}<input className="text-input" type="number" step="any"
              value={uniformityScaleDraft.maximum}
              onChange={(event) => setUniformityScaleDraft((current) => ({ ...current, maximum: event.target.value }))} /></label>
            <label>{tr("resultDetailPage.problemThreshold")}<input className="text-input" type="number" step="any"
              value={uniformityScaleDraft.threshold}
              onChange={(event) => setUniformityScaleDraft((current) => ({ ...current, threshold: event.target.value }))} /></label>
          </div>
          <div className="button-row">
            <button className="button button--secondary button--small" type="submit">{tr("resultDetailPage.applyColorRange")}</button>
            <button className="button button--secondary button--small" type="button" onClick={resetUniformityScale}>{tr("resultDetailPage.resetColorRange")}</button>
          </div>
          <InlineFormError message={uniformityScaleError} />
        </form>
        <p className="run-sheet-muted">{tr("resultDetailPage.valuesUseTheSelectedMetricSUnitBlankBounds")}</p>
        <FigureScopePair resultId={resultIdNumber} kind="uniformity" metric={uniformityMetric} direction={uniformityDirection}
          excludedDeviceIds={[...effectiveExclusions.keys()]} revision={figureRevision} palette={uniformityPalette} scale={uniformityScale} filteredPreview={exclusionChangeCount > 0}
          alt={tr("resultDetailPage.publicationSubstrateUniformityForMetricDirectionScan", { "metric": uniformityMetric, "direction": uniformityDirection })} />
      </section>
      ) : null}

      {statisticsPresent && activeSection === "statistics" ? (
          <section className="panel" aria-labelledby="stats-title">
            <div className="panel__heading">
              <h2 className="panel__title" id="stats-title">{tr("resultDetailPage.directionalGroupStatistics")}</h2>
            </div>
            <p className="run-sheet-muted">{tr("resultDetailPage.oneRepresentativeScanPerDeviceAndDirectionBestAnd")}</p>
            <div className="table-scroll">
              <table className="data-table" aria-label={tr("resultDetailPage.directionalGroupStatistics")}>
                <thead>
                  <tr>
                    <th>{tr("deviceExclusionsPanel.group")}</th>
                    <th>{tr("presetDetailView.scope")}</th>
                    <th>{tr("jvChart.scan")}</th>
                    <th>{tr("conditionCard.devices")}</th>
                    {METRIC_META.map((m) => <th key={m.name}>{m.label}<br /><span className="run-sheet-muted">{tr("resultDetailPage.bestMean")}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {directionalStatistics.map((row) => (
                    <tr key={`${row.groupId}-${row.scope}-${row.direction}`}>
                      <td>{row.groupName}</td>
                      <td>{row.scope === "all" ? tr("resultDetailPage.allDevices") : tr("resultDetailPage.afterExclusions")}</td>
                      <td>{row.direction === "forward" ? tr("deviceScanHistoryPanel.forward") : tr("deviceScanHistoryPanel.reverse")}</td>
                      <td>{row.deviceCount}</td>
                      {METRIC_META.map((m) => {
                        const stat = row.metrics[m.name];
                        return (
                          <td key={m.name}>
                            <strong>{formatNumber(scaleMetric(m.name, stat.maximum), 2)}</strong>
                            <br />
                            <span className="run-sheet-muted">{formatNumber(scaleMetric(m.name, stat.mean), 2)}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
      ) : null}

      {statisticsPresent && activeSection === "statistics" ? (
          <section className="panel" aria-labelledby="boxplot-title">
            <div className="panel__heading">
              <h2 className="panel__title" id="boxplot-title">{tr("resultDetailPage.metricDistributions")}</h2>
              <label>{tr("resultDetailPage.metric")}<select className="text-input" value={distributionMetric}
                onChange={(event) => setDistributionMetric(event.target.value as typeof distributionMetric)}>
                {METRIC_META.map((metric) => <option key={metric.name} value={metric.name}>{metric.label}</option>)}
              </select></label>
              <label>{tr("jvChart.colorPalette")}<select className="text-input" value={distributionPalette}
                onChange={(event) => setDistributionPalette(event.target.value)}>
                {CATEGORICAL_PALETTES.map(([value, label]) => <option key={value} value={value}>{localizeAppText(label)}</option>)}
              </select></label>
            </div>
            <p className="run-sheet-muted">{tr("resultDetailPage.forwardAndReverseScansAreSeparateFRBoth")}</p>
            <FigureScopePair resultId={resultIdNumber} kind="boxplot" metric={distributionMetric}
              excludedDeviceIds={[...effectiveExclusions.keys()]} revision={figureRevision} palette={distributionPalette} filteredPreview={exclusionChangeCount > 0}
              alt={tr("resultDetailPage.metricPublicationBoxPlotWithDevicePointsSplitBy", { "metric": METRIC_META.find((metric) => metric.name === distributionMetric)?.label })}
            />
          </section>
      ) : null}
    </div>
  );
}
