import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { apiFetch } from "../../lib/api";
import type { FabricationBatchListItem } from "../../types/api";
import type { CampaignAnalysis, RepresentativeRule } from "./types";
import {
  METRIC_LABELS,
  ORIGIN_MARKERS,
  buildParameterRows,
  buildSummaryRows,
  buildVariantColumns,
  conditionDirectoryMap,
  conditionLabel,
  describeCoverage,
  formatMetricValue,
  referencedResultFiles,
  shortDigest,
} from "./campaignView";

const ORIGIN_COLORS: Record<string, string> = {
  actual: "#1a7f37",
  planned: "#b66a00",
  not_executed: "#b3261e",
};

interface CampaignAnalysisPanelProps {
  /** Experiments already loaded by the workbench; campaign choices derive
   * from their campaign ids so the panel never lists invisible campaigns. */
  campaignIds: string[];
  /** Experiment id → campaign id, used to scope the batch filter. */
  experimentCampaignById: Map<number, string | null>;
  batches: FabricationBatchListItem[];
}

function SectionHeading({ children, hint }: { children: string; hint?: string }) {
  return (
    <Typography component="h3" sx={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.12px" }}>
      {children}
      {hint ? (
        <Tooltip title={hint}>
          <span style={{ marginLeft: 6, color: "rgba(0,0,0,.48)", fontWeight: 400, cursor: "help" }}>ⓘ</span>
        </Tooltip>
      ) : null}
    </Typography>
  );
}

function OriginBadge({ origin }: { origin: string | null }) {
  if (!origin) return null;
  return (
    <span style={{
      marginLeft: 6,
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: "-0.12px",
      color: ORIGIN_COLORS[origin] ?? "rgba(0,0,0,.48)",
    }}>
      {ORIGIN_MARKERS[origin as keyof typeof ORIGIN_MARKERS] ?? origin}
    </span>
  );
}

/** Campaign comparison section of the analysis workbench: read-only
 * directional summaries, actual-versus-planned process provenance,
 * same-batch control/target comparisons, coverage, and diagnostics. All
 * statistics are computed by the backend; this panel only filters, links,
 * and formats (FF percent conversion happens once, in campaignView). */
export function CampaignAnalysisPanel({ campaignIds, experimentCampaignById, batches }: CampaignAnalysisPanelProps) {
  const [campaign, setCampaign] = useState<string | null>(campaignIds[0] ?? null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [representative, setRepresentative] = useState<RepresentativeRule>("latest");
  const [analysis, setAnalysis] = useState<CampaignAnalysis | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const requestToken = useRef(0);

  const campaignBatches = useMemo(
    () =>
      batches.filter(
        (batch) => campaign !== null && experimentCampaignById.get(batch.experiment_id) === campaign,
      ),
    [batches, experimentCampaignById, campaign],
  );

  useEffect(() => {
    if (campaign === null) {
      setAnalysis(null);
      setState("idle");
      return;
    }
    const token = ++requestToken.current;
    setState("loading");
    setError(null);
    const params = new URLSearchParams({ representative });
    if (batchId !== null) params.set("fabrication_batch_id", String(batchId));
    let cancelled = false;
    apiFetch<CampaignAnalysis>(`/api/campaigns/${encodeURIComponent(campaign)}/analysis?${params.toString()}`)
      .then((payload) => {
        if (cancelled || requestToken.current !== token) return;
        setAnalysis(payload);
        setState("success");
      })
      .catch((caught: unknown) => {
        if (cancelled || requestToken.current !== token) return;
        setError(caught instanceof Error ? caught.message : "Unable to load the campaign analysis.");
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [campaign, batchId, representative]);

  if (campaignIds.length === 0) {
    return (
      <Typography sx={{ fontSize: 13.5, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)" }}>
        Campaign comparison needs an experiment in a campaign — none is visible yet.
      </Typography>
    );
  }

  const directory = analysis ? conditionDirectoryMap(analysis) : new Map();
  const summaryRows = analysis ? buildSummaryRows(analysis) : [];
  const parameterRows = analysis ? buildParameterRows(analysis) : [];
  const variantColumns = analysis ? buildVariantColumns(analysis) : [];
  const resultFileIds = analysis ? referencedResultFiles(analysis) : [];

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <SectionHeading hint="Read-only comparison across the campaign: directional device statistics, recorded actual process variants against the frozen plan, and same-batch control/target differences.">
        Campaign comparison
      </SectionHeading>

      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
        <TextField
          select
          size="small"
          label="Campaign"
          value={campaign ?? ""}
          onChange={(event) => { setBatchId(null); setCampaign(event.target.value); }}
          sx={{ width: 220, maxWidth: "100%" }}
        >
          {campaignIds.map((code) => (
            <MenuItem key={code} value={code}>{code}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Batch"
          value={batchId === null ? "all" : String(batchId)}
          onChange={(event) => setBatchId(event.target.value === "all" ? null : Number(event.target.value))}
          sx={{ width: 200, maxWidth: "100%" }}
        >
          <MenuItem value="all">All batches</MenuItem>
          {campaignBatches.map((batch) => (
            <MenuItem key={batch.id} value={String(batch.id)}>{batch.batch_code}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Representative"
          value={representative}
          onChange={(event) => setRepresentative(event.target.value as RepresentativeRule)}
          sx={{ width: 200, maxWidth: "100%" }}
        >
          <MenuItem value="latest">latest upload</MenuItem>
          <MenuItem value="mean">mean across uploads</MenuItem>
        </TextField>
      </Box>

      {state === "loading" ? (
        <Typography role="status" sx={{ fontSize: 13, letterSpacing: "-0.12px" }}>Loading campaign analysis…</Typography>
      ) : null}
      {state === "error" ? (
        <Typography role="alert" sx={{ fontSize: 13, letterSpacing: "-0.12px", color: "#b3261e" }}>
          Unable to load the campaign analysis: {error}
        </Typography>
      ) : null}
      {state === "success" && analysis ? (
        <>
          <Typography sx={{ fontSize: 12, color: "rgba(0,0,0,.48)", letterSpacing: "-0.12px" }}>
            {analysis.experiment_count} experiment(s) in scope · rules {analysis.rules_version} ·
            representative {analysis.scope.representative} · digest {shortDigest(analysis.content_digest)}
          </Typography>

          <Box sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 1.5, minWidth: 0 }}>
            <SectionHeading hint="Forward and reverse scans are reported separately. Device statistics are descriptive; the substrate mean is the equally weighted per-substrate view.">
              Directional summaries
            </SectionHeading>
            {summaryRows.length === 0 ? (
              <Typography sx={{ fontSize: 13, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)" }}>
                No measured devices are visible in this scope yet.
              </Typography>
            ) : (
              <Box role="region" aria-label="Campaign summary table" tabIndex={0} sx={{ overflowX: "auto", maxWidth: "100%" }}>
                <table className="data-table" style={{ width: "100%", fontSize: 13, letterSpacing: "-0.12px" }}>
                  <caption className="visually-hidden">Directional summaries per condition variant, forward and reverse separate</caption>
                  <thead>
                    <tr>
                      <th scope="col">Condition</th>
                      <th scope="col">Variant</th>
                      <th scope="col">Direction</th>
                      <th scope="col">Devices</th>
                      <th scope="col">Substrates</th>
                      <th scope="col">Measurements</th>
                      <th scope="col">PCE median</th>
                      <th scope="col">PCE best</th>
                      <th scope="col">Voc</th>
                      <th scope="col">Jsc</th>
                      <th scope="col">FF</th>
                      <th scope="col">Substrate-mean PCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.flatMap((row) => (["forward", "reverse"] as const).map((direction) => {
                      const cells = row[direction];
                      return (
                        <tr key={`${row.key}:${direction}`}>
                          <th scope="row" style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>
                            {direction === "forward" ? row.conditionLabel : ""}
                          </th>
                          <td>{direction === "forward" ? row.variantLabel : ""}</td>
                          <td>{direction}</td>
                          <td>{cells ? cells.deviceCount : "—"}</td>
                          <td>{cells ? cells.substrateCount : "—"}</td>
                          <td>{cells ? cells.measurementCount : "—"}</td>
                          <td>{cells ? formatMetricValue("pce", cells.pceMedian) : "—"}</td>
                          <td>{cells ? formatMetricValue("pce", cells.pceBest) : "—"}</td>
                          <td>{cells ? formatMetricValue("voc", cells.vocMedian) : "—"}</td>
                          <td>{cells ? formatMetricValue("jsc", cells.jscMedian) : "—"}</td>
                          <td>{cells ? formatMetricValue("ff", cells.ffMedian) : "—"}</td>
                          <td>
                            {cells && cells.substrateUnits > 0
                              ? `${formatMetricValue("pce", cells.substrateMeanPce)} (${cells.substrateUnits} substrate units)`
                              : "—"}
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </Box>
            )}
          </Box>

          <Box sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 1.5, minWidth: 0 }}>
            <SectionHeading hint="Each variant shows the effective value behind the statistics (the recorded actual value, the frozen-plan fallback marked 'planned', or '—' for a step the execution never performed) beside the frozen plan's reference value. '◆ deviates from plan' marks rows where the effective value differs from the plan.">
              Actual process vs frozen plan
            </SectionHeading>
            {analysis.conditions.every((condition) => condition.variants.length === 0) ? (
              <Typography sx={{ fontSize: 13, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)" }}>
                No fabrication batches exist for this scope yet.
              </Typography>
            ) : (
              <Box role="region" aria-label="Actual process comparison table" tabIndex={0} sx={{ overflowX: "auto", maxWidth: "100%" }}>
                <table className="data-table" style={{ width: "100%", fontSize: 13, letterSpacing: "-0.12px" }}>
                  <caption className="visually-hidden">Recorded actual process parameters beside the frozen plan reference per condition variant</caption>
                  <thead>
                    <tr>
                      <th scope="col" rowSpan={2} style={{ verticalAlign: "bottom" }}>Parameter</th>
                      {variantColumns.map((column) => (
                        <th scope="col" colSpan={2} key={column.key}
                          style={{ minWidth: 200, whiteSpace: "normal", overflowWrap: "anywhere" }}>
                          {conditionLabel(directory.get(column.condition.batch_condition_id), column.condition.batch_condition_id)}
                          <br />
                          Variant {column.variant.variant_index + 1} · {column.variant.feature_source}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {variantColumns.map((column) => (
                        <Fragment key={column.key}>
                          <th scope="col">Actual / effective</th>
                          <th scope="col" style={{ color: "rgba(0,0,0,.48)" }}>Planned (frozen)</th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parameterRows.map((row) => (
                      <tr key={row.parameter}>
                        <th scope="row" style={{ whiteSpace: "normal", minWidth: 180 }}>
                          {row.label}
                          {row.differs ? (
                            <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 600, color: "#b66a00", letterSpacing: "-0.12px" }}>◆ differs</span>
                          ) : null}
                          {row.deviatesFromPlan ? (
                            <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 600, color: "#0b57d0", letterSpacing: "-0.12px" }}>◆ deviates from plan</span>
                          ) : null}
                        </th>
                        {row.cells.map((cell, index) => (
                          <Fragment key={variantColumns[index]?.key ?? index}>
                            <td style={{ whiteSpace: "normal", overflowWrap: "anywhere", background: row.differs ? "rgba(182,106,0,.07)" : "transparent" }}>
                              {cell.effectiveText}
                              <OriginBadge origin={cell.origin} />
                            </td>
                            <td style={{ whiteSpace: "normal", overflowWrap: "anywhere", color: "rgba(0,0,0,.48)" }}>
                              {cell.plannedText}
                            </td>
                          </Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </Box>

          {analysis.comparisons.length > 0 ? (
            <Box sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 1.5, minWidth: 0 }}>
              <SectionHeading hint="Descriptive difference of equally weighted substrate means within one batch. No significance test is applied; percent change is undefined when the control mean is zero.">
                Same-batch control vs target
              </SectionHeading>
              <Box role="region" aria-label="Control target comparison table" tabIndex={0} sx={{ overflowX: "auto", maxWidth: "100%" }}>
                <table className="data-table" style={{ width: "100%", fontSize: 13, letterSpacing: "-0.12px" }}>
                  <caption className="visually-hidden">Descriptive control versus target comparisons per batch, direction, and metric</caption>
                  <thead>
                    <tr>
                      <th scope="col">Batch</th>
                      <th scope="col">Control</th>
                      <th scope="col">Target</th>
                      <th scope="col">Direction</th>
                      <th scope="col">Metric</th>
                      <th scope="col">Control mean</th>
                      <th scope="col">Target mean</th>
                      <th scope="col">Difference</th>
                      <th scope="col">Change</th>
                      <th scope="col">Units (control/target)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.comparisons.map((comparison) => (
                      <tr key={`${comparison.batch_id}:${comparison.control_batch_condition_id}:${comparison.target_batch_condition_id}:${comparison.direction}:${comparison.metric}`}>
                        <th scope="row" style={{ whiteSpace: "normal" }}>
                          {analysis.condition_directory.find((entry) => entry.batch_condition_id === comparison.control_batch_condition_id)?.batch_code ?? comparison.batch_id}
                        </th>
                        <td style={{ whiteSpace: "normal" }}>
                          {conditionLabel(directory.get(comparison.control_batch_condition_id), comparison.control_batch_condition_id)}
                        </td>
                        <td style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>
                          {conditionLabel(directory.get(comparison.target_batch_condition_id), comparison.target_batch_condition_id)}
                        </td>
                        <td>{comparison.direction}</td>
                        <td>{METRIC_LABELS[comparison.metric] ?? comparison.metric}</td>
                        <td>{formatMetricValue(comparison.metric, comparison.control_mean)}</td>
                        <td>{formatMetricValue(comparison.metric, comparison.target_mean)}</td>
                        <td>{formatMetricValue(comparison.metric, comparison.difference)}</td>
                        <td>{comparison.percent_change === null ? "— (control mean is zero)" : `${comparison.percent_change.toFixed(1)}%`}</td>
                        <td>{comparison.n_control_units}/{comparison.n_target_units}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Box>
          ) : null}

          <Box sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 1.5, minWidth: 0 }}>
            <SectionHeading hint={analysis.coverage[0]?.note}>
              Measurement coverage
            </SectionHeading>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              {analysis.coverage.map((coverage) => {
                const display = describeCoverage(coverage);
                return (
                  <Tooltip key={coverage.batch_condition_id} title={display.title}>
                    <Typography sx={{ fontSize: 13, letterSpacing: "-0.12px", bgcolor: "#fff", borderRadius: "8px", px: 1, py: 0.5 }}>
                      {conditionLabel(directory.get(coverage.batch_condition_id), coverage.batch_condition_id)}: {display.label}
                    </Typography>
                  </Tooltip>
                );
              })}
            </Box>
          </Box>

          <Box sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 1.5, minWidth: 0 }}>
            <SectionHeading hint="Every excluded or unresolvable record is listed here; nothing is silently dropped from the payload.">
              Data quality
            </SectionHeading>
            {analysis.diagnostics.length === 0 ? (
              <Typography sx={{ fontSize: 13, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)" }}>
                No exclusions, unbound devices, missing directions, or legacy records in this scope.
              </Typography>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, letterSpacing: "-0.12px" }}>
                {analysis.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.code}:${index}`}>
                    <span style={{ fontWeight: 600 }}>{diagnostic.code}</span>: {diagnostic.message}
                    {diagnostic.result_file_id !== null ? (
                      <> <a href={`/app/results/${diagnostic.result_file_id}`}>Result {diagnostic.result_file_id}</a></>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {resultFileIds.length > 0 ? (
              <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                {resultFileIds.map((fileId) => (
                  <a key={fileId} href={`/app/results/${fileId}`} style={{ fontSize: 12.5, letterSpacing: "-0.12px" }}>
                    Source result {fileId}
                  </a>
                ))}
              </Box>
            ) : null}
          </Box>
        </>
      ) : null}
    </Stack>
  );
}
