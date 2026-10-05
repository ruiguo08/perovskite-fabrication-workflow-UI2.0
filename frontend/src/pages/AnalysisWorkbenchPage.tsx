import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { PageHeader } from "../components/PageHeader";
import { apiFetch } from "../lib/api";
import { buildConditionMatrix, type ConditionMatrix } from "../lib/conditionMatrix";
import { formatRelativeTime } from "../lib/format";
import type { Experiment, ExperimentDetail, FabricationBatchListItem, ResultListItem } from "../types/api";

const PALETTES = ["science-tol", "nature-classic", "lancet-clinical", "nejm"];
type LoadState = "idle" | "loading" | "success" | "error";

export function AnalysisWorkbenchPage() {
  const [results, setResults] = useState<ResultListItem[] | null>(null);
  const [experiments, setExperiments] = useState<Experiment[] | null>(null);
  const [batches, setBatches] = useState<FabricationBatchListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [palette, setPalette] = useState("science-tol");
  const [overlay, setOverlay] = useState<{ url: string; token: number; labels: string } | null>(null);
  const [overlayState, setOverlayState] = useState<LoadState>("idle");
  const [matrix, setMatrix] = useState<ConditionMatrix | null>(null);
  const [conditionState, setConditionState] = useState<LoadState>("idle");
  const [conditionError, setConditionError] = useState<string | null>(null);
  const conditionRequest = useRef(0);
  const overlayRequest = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [resultRows, experimentRows, batchRows] = await Promise.all([
          apiFetch<ResultListItem[]>("/api/results"), apiFetch<Experiment[]>("/api/experiments"),
          apiFetch<FabricationBatchListItem[]>("/api/fabrication-batches"),
        ]);
        if (cancelled) return;
        setResults(resultRows); setExperiments(experimentRows); setBatches(batchRows);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load the workbench.");
      }
    }
    void load();
    return () => { cancelled = true; conditionRequest.current += 1; overlayRequest.current += 1; };
  }, []);

  const experimentById = useMemo(() => new Map((experiments ?? []).map((row) => [row.id, row])), [experiments]);
  const batchById = useMemo(() => new Map((batches ?? []).map((row) => [row.id, row])), [batches]);
  const resultById = useMemo(() => new Map((results ?? []).map((row) => [row.id, row])), [results]);

  function toggle(id: number) {
    conditionRequest.current += 1;
    overlayRequest.current += 1;
    setMatrix(null); setConditionState("idle"); setConditionError(null);
    setOverlay(null); setOverlayState("idle");
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : current.length < 12 ? [...current, id] : current);
  }

  function renderOverlay() {
    if (selected.length === 0) return;
    const token = ++overlayRequest.current;
    const query = selected.map((id) => `result_id=${id}`).join("&");
    const labels = selected.map((id) => {
      const result = resultById.get(id);
      return `${result?.experiment_code ?? "Unnamed experiment"}/${result?.batch_code ?? ""}: ${result?.filename ?? ""}`;
    }).join(", ");
    // Keep the authenticated, same-origin endpoint directly in img.src.
    // CSP deliberately excludes blob: URLs; each render has a unique URL.
    setOverlay({ url: `/api/analysis/jv-overlay?${query}&format=svg&palette=${palette}&_=${Date.now()}-${token}`, token, labels });
    setOverlayState("loading");
  }

  async function loadConditions() {
    if (selected.length === 0) return;
    const token = ++conditionRequest.current;
    setMatrix(null); setConditionState("loading"); setConditionError(null);
    const ids = [...new Set(selected.map((id) => resultById.get(id)?.experiment_id).filter((id): id is number => id !== undefined))];
    try {
      const details = await Promise.all(ids.map((id) => apiFetch<ExperimentDetail>(`/api/experiments/${id}`)));
      if (conditionRequest.current !== token) return;
      setMatrix(buildConditionMatrix(details)); setConditionState("success");
    } catch (caught) {
      if (conditionRequest.current !== token) return;
      setConditionError(caught instanceof Error ? caught.message : "Unable to load condition snapshots.");
      setConditionState("error");
    }
  }

  return (
    <>
      <PageHeader title="Analysis workbench" description="Overlay J-V curves and compare frozen planned conditions across characterization results." />
      {error ? <Typography role="alert" sx={{ color: "#b3261e", fontSize: 14, letterSpacing: "-0.224px" }}>{error}</Typography>
        : results === null || experiments === null || batches === null ? <div className="page-loading" role="status">Loading the workbench…</div>
        : results.length === 0 ? <Typography sx={{ color: "rgba(0,0,0,.48)", fontSize: 14, letterSpacing: "-0.224px" }}>No characterization results exist yet — upload a result file first.</Typography>
        : (
          <Box sx={{ display: "grid", gridTemplateColumns: "340px minmax(0, 1fr)", gap: 2.5, alignItems: "start", minWidth: 0,
            "@media (max-width: 720px)": { gridTemplateColumns: "minmax(0, 1fr)" } }}>
            <Box sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 1.5, minWidth: 0 }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)", px: 1, pb: 1 }}>
                RESULTS · {selected.length} SELECTED (MAX 12)
              </Typography>
              {results.map((result) => {
                const experiment = experimentById.get(result.experiment_id);
                const batch = batchById.get(result.fabrication_batch_id);
                const bestPce = batch?.best_pce ?? experiment?.best_pce;
                const scope = batch?.best_pce !== null && batch?.best_pce !== undefined ? "batch" : "experiment";
                const identity = `${result.experiment_code ?? "Unnamed experiment"}/${result.batch_code}: ${result.filename}`;
                return (
                  <Box key={result.id} component="label" sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 0.75,
                    borderRadius: "8px", minWidth: 0, "&:hover": { bgcolor: "rgba(0,0,0,.04)" } }}>
                    <Checkbox size="small" checked={selected.includes(result.id)} disabled={selected.length === 12 && !selected.includes(result.id)}
                      onChange={() => toggle(result.id)} sx={{ p: 0.25 }} slotProps={{ input: { "aria-label": `Select ${identity}` } }} />
                    <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.filename}</Typography>
                      <Typography sx={{ fontSize: 12, color: "rgba(0,0,0,.48)", letterSpacing: "-0.12px" }}>
                        {result.experiment_code ?? "Unnamed experiment"} · {result.batch_code} · {formatRelativeTime(result.created_at)}
                        {bestPce !== null && bestPce !== undefined ? ` · ${bestPce.toFixed(2)}% best PCE in ${scope}` : ""}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            <Stack spacing={2} sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
                <TextField select size="small" label="Palette" value={palette} sx={{ width: 200, maxWidth: "100%" }}
                  onChange={(event) => { overlayRequest.current += 1; setPalette(event.target.value); setOverlay(null); setOverlayState("idle"); }}>
                  {PALETTES.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
                </TextField>
                <Button variant="contained" data-workbench-render="true" disabled={selected.length === 0} onClick={renderOverlay}>Render overlay</Button>
                <Button color="inherit" disabled={selected.length === 0 || conditionState === "loading"} onClick={() => void loadConditions()}>Compare conditions</Button>
              </Box>

              <Box sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 1.5, minHeight: 280, minWidth: 0, overflowWrap: "anywhere" }}>
                {overlayState === "loading" ? <Typography role="status" sx={{ fontSize: 13, letterSpacing: "-0.12px" }}>Rendering overlay for {overlay?.labels}…</Typography> : null}
                {overlayState === "error" ? <Typography role="alert" sx={{ fontSize: 13, letterSpacing: "-0.12px", color: "#b3261e" }}>
                  Unable to render the overlay for {overlay?.labels}. Results need valid forward J-V traces. Review the selected files or try rendering again.
                </Typography> : overlay ? <Box component="img" key={overlay.url} src={overlay.url} alt={`Cross-result J-V overlay: ${overlay.labels}`}
                  onLoad={() => { if (overlayRequest.current === overlay.token) setOverlayState("success"); }}
                  onError={() => { if (overlayRequest.current === overlay.token) setOverlayState("error"); }}
                  sx={{ display: "block", maxWidth: "100%", height: "auto", borderRadius: "8px", bgcolor: "#fff" }} />
                  : <Typography sx={{ fontSize: 13.5, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)" }}>Select results and render the overlay — one best forward curve per result file.</Typography>}
              </Box>

              {conditionState === "loading" ? <Typography role="status" sx={{ fontSize: 13, letterSpacing: "-0.12px" }}>Loading frozen conditions for the selected experiments…</Typography> : null}
              {conditionError ? <Typography role="alert" sx={{ fontSize: 13, letterSpacing: "-0.12px", color: "#b3261e" }}>Unable to compare the selected experiments: {conditionError}</Typography> : null}
              {matrix ? <Box sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 2, minWidth: 0 }}>
                <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.224px", mb: 1.5 }}>Condition comparison</Typography>
                <Typography sx={{ fontSize: 13, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)", mb: 1.5 }}>Values show the saved plan for every control and target condition.</Typography>
                {matrix.columns.length === 0 ? <Typography sx={{ fontSize: 13, letterSpacing: "-0.12px" }}>No frozen conditions are available for these experiments.</Typography>
                  : <Box role="region" aria-label="Condition comparison table" tabIndex={0} sx={{ overflowX: "auto", maxWidth: "100%" }}>
                    <table className="data-table" style={{ width: "100%", fontSize: 13, letterSpacing: "-0.12px" }}>
                      <caption className="visually-hidden">Frozen planned conditions for all selected experiments, including control and target conditions</caption>
                      <thead><tr><th scope="col">Parameter</th>{matrix.columns.map((column) => <th scope="col" key={column.key} style={{ minWidth: 200, whiteSpace: "normal", overflowWrap: "anywhere" }}>
                        {column.experiment}<br />{column.condition}<br />{column.role}
                      </th>)}</tr></thead>
                      <tbody>{matrix.rows.map((row) => <tr key={row.parameter}>
                        <th scope="row" style={{ minWidth: 180, whiteSpace: "normal" }}>{row.parameter}
                          {row.differs ? <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 600, color: "#b66a00", letterSpacing: "-0.12px" }}>◆ differs</span> : null}
                        </th>
                        {row.values.map((value, index) => <td key={matrix.columns[index].key} style={{ whiteSpace: "normal", overflowWrap: "anywhere",
                          background: row.differs ? "rgba(182,106,0,.07)" : "transparent" }}>{value ?? "—"}</td>)}
                      </tr>)}</tbody>
                    </table>
                  </Box>}
              </Box> : null}
            </Stack>
          </Box>
        )}
    </>
  );
}
