import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { PageHeader } from "../components/PageHeader";
import { apiFetch } from "../lib/api";
import { formatRelativeTime } from "../lib/format";
import type {
  Experiment,
  FabricationBatchListItem,
  ResultListItem,
} from "../types/api";

/* Analysis workbench (phase 3, D3): pick characterization results across
   experiments and overlay their best forward J-V curves — rendered by the
   frozen server-side matplotlib pipeline through /api/analysis/jv-overlay —
   plus a condition-comparison matrix for the owning experiments. */

const PALETTES = ["science-tol", "nature-classic", "lancet-clinical", "nejm"];

interface ConditionRow {
  parameter: string;
  values: (string | null)[];
}

export function AnalysisWorkbenchPage() {
  const [results, setResults] = useState<ResultListItem[] | null>(null);
  const [experiments, setExperiments] = useState<Experiment[] | null>(null);
  const [batches, setBatches] = useState<FabricationBatchListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [palette, setPalette] = useState("science-tol");
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [conditions, setConditions] = useState<ConditionRow[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [resultRows, experimentRows, batchRows] = await Promise.all([
          apiFetch<ResultListItem[]>("/api/results"),
          apiFetch<Experiment[]>("/api/experiments"),
          apiFetch<FabricationBatchListItem[]>("/api/fabrication-batches"),
        ]);
        if (cancelled) return;
        setResults(resultRows);
        setExperiments(experimentRows);
        setBatches(batchRows);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load the workbench.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const experimentByCode = useMemo(() => {
    const map = new Map<string, Experiment>();
    for (const row of experiments ?? []) {
      if (row.experiment_code) map.set(row.experiment_code, row);
    }
    return map;
  }, [experiments]);

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id].slice(-12),
    );
  }

  function renderOverlay() {
    if (selected.length === 0) {
      setRenderError("Select at least one result.");
      return;
    }
    setRenderError(null);
    // CSP img-src only allows 'self' and data: — no blob: URLs — so the
    // overlay <img> points straight at the endpoint (same-origin cookies
    // authenticate it). A cache-busting nonce forces a reload per render.
    const query = selected.map((id) => `result_id=${id}`).join("&");
    setOverlayUrl(`/api/analysis/jv-overlay?${query}&format=svg&palette=${palette}&_=${Date.now()}`);
  }

  async function loadConditions() {
    if (selected.length === 0) {
      setRenderError("Select at least one result.");
      return;
    }
    setRenderError(null);
    try {
      // Condition snapshots of the owning experiments: the authoritative,
      // hash-verified configuration lives on each experiment's conditions
      // (control first). One matrix row per parameter, one column per
      // distinct experiment; differing values highlight per row.
      const rows: Map<string, (string | null)[]> = new Map();
      const columns: string[] = [];
      for (const id of selected) {
        const result = (results ?? []).find((row) => row.id === id);
        if (!result) continue;
        const experimentCode = result.experiment_code ?? `Experiment ${result.experiment_id}`;
        if (!columns.includes(experimentCode)) {
          columns.push(experimentCode);
          for (const values of rows.values()) {
            values.push(null);
          }
        }
        const detail = await apiFetch<{
          conditions: {
            role: string;
            recipe_snapshot: {
              device: {
                substrate: { material: string };
                junction_type: string;
                perovskite_bandgap: string | null;
                layers: { name: string; role: string }[];
              };
            };
          }[];
        }>(`/api/experiments/${result.experiment_id}`);
        const control =
          detail.conditions.find((condition) => condition.role !== "target") ??
          detail.conditions[0];
        const device = control?.recipe_snapshot?.device;
        const entries: [string, string][] = [
          ["Substrate", device?.substrate?.material ?? "—"],
          ["Junction", device?.junction_type ?? "—"],
          ["Bandgap", device?.perovskite_bandgap ?? "—"],
        ];
        for (const [index, layer] of (device?.layers ?? []).entries()) {
          entries.push([`Layer ${index + 1}`, `${layer.name} (${layer.role})`]);
        }
        const columnIndex = columns.indexOf(experimentCode);
        for (const [parameter, value] of entries) {
          if (!rows.has(parameter)) {
            rows.set(parameter, Array.from({ length: columns.length }, () => null));
          }
          const column = rows.get(parameter);
          if (column) {
            while (column.length < columns.length) column.push(null);
            column[columnIndex] = value;
          }
        }
      }
      setConditions(
        [...rows.entries()].map(([parameter, values]) => ({ parameter, values })),
      );
    } catch (caught) {
      setRenderError(caught instanceof Error ? caught.message : "Unable to load condition snapshots.");
    }
  }

  if (error) {
    return (
      <>
        <PageHeader title="Analysis workbench" description="Cross-experiment comparison." />
        <Typography sx={{ color: "#b3261e", fontSize: 14 }}>{error}</Typography>
      </>
    );
  }
  const loading = results === null || experiments === null || batches === null;

  return (
    <>
      <PageHeader
        title="Analysis workbench"
        description="Overlay J-V curves and compare conditions across characterization results. Figures render server-side through the publication pipeline."
      />
      {loading ? (
        <div className="page-loading" role="status">Loading the workbench…</div>
      ) : (results ?? []).length === 0 ? (
        <Typography sx={{ color: "rgba(0,0,0,.48)", fontSize: 14 }}>
          No characterization results exist yet — upload a result file first.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 2.5, alignItems: "start" }}>
          <Box sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 1.5 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".05px",
              color: "rgba(0,0,0,.48)", px: 1, pb: 1 }}>
              RESULTS · {selected.length} SELECTED (MAX 12)
            </Typography>
            {(results ?? []).map((result) => {
              const experimentCode = result.experiment_code ?? `Experiment ${result.experiment_id}`;
              const experiment = experimentByCode.get(experimentCode);
              const bestPce = experiment?.best_pce;
              return (
                <Box key={result.id} sx={{
                  display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.75,
                  borderRadius: "8px", "&:hover": { bgcolor: "rgba(0,0,0,.04)" },
                }}>
                  <Checkbox
                    size="small"
                    checked={selected.includes(result.id)}
                    onChange={() => toggle(result.id)}
                    sx={{ p: 0.25 }}
                    slotProps={{ input: { "aria-label": `Select ${result.filename}` } }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.12px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {result.filename}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "rgba(0,0,0,.48)", letterSpacing: "-0.12px" }}>
                      {experimentCode} · {result.batch_code} · {formatRelativeTime(result.created_at)}
                      {bestPce !== null && bestPce !== undefined ? ` · ${bestPce.toFixed(2)}%` : ""}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <TextField
                select
                size="small"
                label="Palette"
                value={palette}
                onChange={(event) => setPalette(event.target.value)}
                sx={{ width: 200 }}
              >
                {PALETTES.map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                data-workbench-render="true"
                disabled={selected.length === 0}
                onClick={renderOverlay}
              >
                Render overlay
              </Button>
              <Button
                color="inherit"
                disabled={selected.length === 0}
                onClick={() => void loadConditions()}
              >
                Compare conditions
              </Button>
              {renderError ? (
                <Typography sx={{ fontSize: 13, color: "#b3261e" }}>{renderError}</Typography>
              ) : null}
            </Stack>

            <Box sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 1.5, minHeight: 280,
              display: "grid", placeItems: "center" }}>
              {overlayUrl ? (
                <Box component="img" src={overlayUrl} alt="Cross-result J-V overlay"
                  sx={{ display: "block", maxWidth: "100%", borderRadius: "10px", bgcolor: "#fff" }} />
              ) : (
                <Typography sx={{ fontSize: 13.5, color: "rgba(0,0,0,.48)" }}>
                  Select results and render the overlay — one best forward curve per result file.
                </Typography>
              )}
            </Box>

            {conditions ? (
              <Box sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 2 }}>
                <Typography sx={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.224px", mb: 1.5 }}>
                  Condition comparison
                </Typography>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", fontSize: 12, fontWeight: 600,
                        color: "rgba(0,0,0,.48)", padding: "8px 10px",
                        borderBottom: "1px solid rgba(0,0,0,.1)" }}>Parameter</th>
                      {conditions[0]?.values.map((_, index) => (
                        <th key={index} style={{ textAlign: "left", fontSize: 12,
                          fontWeight: 600, color: "rgba(0,0,0,.48)", padding: "8px 10px",
                          borderBottom: "1px solid rgba(0,0,0,.1)" }}>
                          Experiment {index + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {conditions.map((row) => {
                      // Values differing within a row carry an amber tint:
                      // the point of the matrix is spotting what changed.
                      const distinct = new Set(row.values.filter((value) => value !== null));
                      const differs = distinct.size > 1;
                      return (
                        <tr key={row.parameter}>
                          <td style={{ padding: "7px 10px",
                            borderBottom: "1px solid rgba(0,0,0,.05)", fontWeight: 600,
                            fontSize: 12.5 }}>
                            {row.parameter}
                            {differs ? (
                              <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 600,
                                color: "#b66a00", letterSpacing: ".05px" }}>◆ differs</span>
                            ) : null}
                          </td>
                          {row.values.map((value, index) => (
                            <td key={index} style={{ padding: "7px 10px",
                              borderBottom: "1px solid rgba(0,0,0,.05)",
                              background: differs && value !== null ? "rgba(182,106,0,.07)" : "transparent" }}>
                              {value ?? "—"}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            ) : null}
          </Stack>
        </Box>
      )}
    </>
  );
}
