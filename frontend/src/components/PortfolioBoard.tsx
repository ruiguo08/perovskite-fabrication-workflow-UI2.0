import { useMemo } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { formatRelativeTime } from "../lib/format";
import type { FabricationBatchListItem, ResultListItem } from "../types/api";

interface BoardExperiment {
  id: number;
  experiment_code: string | null;
  status: string;
  plan_status: string | null;
  updated_at: string;
}

interface BoardCard {
  id: string;
  code: string;
  title: string;
  status: string;
  ageHours: number | null;
  ageLabel: string;
  to: string;
  batchBestPce: number | null;
}

const AGING_STALE_HOURS = 24;
const STATUS_COLOR: Record<string, string> = {
  draft: "#6852b8",
  planned: "#6852b8",
  suggested: "#6852b8",
  pending_approval: "#b66a00",
  approved: "#1e7a4d",
  released: "#168a9d",
  ready: "#168a9d",
  in_progress: "#168a9d",
  completed: "#1e7a4d",
  assigned: "#1e7a4d",
  unassigned: "#b66a00",
  awaiting_measurements: "#b66a00",
};

function ageInfo(timestamp: string | null | undefined, verb: string) {
  const parsed = timestamp ? Date.parse(timestamp) : NaN;
  if (!Number.isFinite(parsed)) {
    return { ageHours: null, ageLabel: "Time unavailable" };
  }
  return {
    ageHours: Math.max(0, (Date.now() - parsed) / 3_600_000),
    ageLabel: `${verb} ${formatRelativeTime(timestamp)}`,
  };
}

function batchPce(batch: FabricationBatchListItem | undefined): number | null {
  return typeof batch?.best_pce === "number" && Number.isFinite(batch.best_pce)
    ? batch.best_pce
    : null;
}

function Dot({ status }: { status: string }) {
  return <Box component="span" aria-hidden sx={{
    width: 7, height: 7, borderRadius: "50%", flex: "none",
    bgcolor: STATUS_COLOR[status] ?? "#8a97a0", display: "inline-block",
  }} />;
}

interface PortfolioBoardProps {
  experiments: BoardExperiment[];
  batches: FabricationBatchListItem[];
  results: ResultListItem[];
}

/** Plans, fabrication batches and measurement files retain their own identity.
 * A completed batch stays visible while it is waiting for its first upload.
 * PCE values belong to the batch's valid forward scans, not to a result file.
 */
export function PortfolioBoard({ experiments, batches, results }: PortfolioBoardProps) {
  const columns = useMemo(() => {
    const experimentById = new Map(experiments.map((row) => [row.id, row]));
    const batchById = new Map(batches.map((row) => [row.id, row]));
    const measuredBatchIds = new Set(results.map((row) => row.fabrication_batch_id));
    const experimentCode = (id: number) => experimentById.get(id)?.experiment_code ?? `Experiment ${id}`;
    const activeExperiments = experiments.filter((row) =>
      !["completed", "cancelled"].includes(row.status) &&
      !["completed", "cancelled"].includes(row.plan_status ?? ""),
    );
    // Records predating the plan lifecycle use the experiment's suggested or
    // planned state. A missing plan_status must not make those plans disappear.
    const planStatus = (row: BoardExperiment) => row.plan_status ?? row.status;
    const planning: BoardCard[] = activeExperiments
      .filter((row) => ["draft", "pending_approval", "suggested", "planned"].includes(planStatus(row)))
      .map((row) => ({
        id: `experiment-${row.id}`,
        code: row.experiment_code ?? `Experiment ${row.id}`,
        title: "Experiment plan",
        status: planStatus(row),
        ...ageInfo(row.updated_at, "updated"),
        to: `/experiments/${row.id}`,
        batchBestPce: null,
      }));
    const approved: BoardCard[] = activeExperiments
      .filter((row) => ["approved", "released"].includes(planStatus(row)))
      .map((row) => ({
        id: `experiment-${row.id}`,
        code: row.experiment_code ?? `Experiment ${row.id}`,
        title: planStatus(row) === "approved" ? "Awaiting release"
          : batches.some((batch) => batch.experiment_id === row.id && batch.status !== "cancelled")
            ? "Batch created" : "Awaiting batch",
        status: planStatus(row),
        ...ageInfo(row.updated_at, "updated"),
        to: `/experiments/${row.id}`,
        batchBestPce: null,
      }));
    const fabrication: BoardCard[] = batches
      .filter((row) => ["draft", "planned", "ready", "in_progress"].includes(row.status))
      .map((row) => ({
        id: `batch-${row.id}`,
        code: row.batch_code,
        title: experimentCode(row.experiment_id),
        status: row.status,
        ...ageInfo(row.started_at ?? row.updated_at, row.started_at ? "started" : "updated"),
        to: `/experiments/${row.experiment_id}/batches/${row.id}`,
        batchBestPce: batchPce(row),
      }));
    const awaitingMeasurements: BoardCard[] = batches
      .filter((row) => row.status === "completed" && !measuredBatchIds.has(row.id))
      .map((row) => ({
        id: `batch-${row.id}`,
        code: row.batch_code,
        title: experimentCode(row.experiment_id),
        status: "awaiting_measurements",
        ...ageInfo(row.completed_at ?? row.updated_at, "completed"),
        to: `/experiments/${row.experiment_id}/batches/${row.id}`,
        batchBestPce: null,
      }));
    const measured: BoardCard[] = results.map((row) => {
      const batch = batchById.get(row.fabrication_batch_id);
      // Never substitute an experiment-wide champion from a different batch.
      const owningBatch = batch?.experiment_id === row.experiment_id ? batch : undefined;
      return {
        id: `result-${row.id}`,
        code: row.filename,
        title: `${experimentCode(row.experiment_id)} · ${row.batch_code ?? owningBatch?.batch_code ?? "Batch unavailable"}`,
        status: row.group_assignment ? "assigned" : "unassigned",
        ...ageInfo(row.created_at, "uploaded"),
        to: `/results/${row.id}`,
        batchBestPce: batchPce(owningBatch),
      };
    });
    return [
      { label: "Planning", cards: planning },
      { label: "Approved", cards: approved },
      { label: "Fabrication", cards: fabrication },
      { label: "Characterization", cards: [...awaitingMeasurements, ...measured] },
    ];
  }, [experiments, batches, results]);
  const total = columns.reduce((sum, column) => sum + column.cards.length, 0);

  return (
    <Box data-portfolio-board="true">
      <Box sx={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 1.5,
      }}>
        {columns.map((column) => (
          <Box component="section" aria-label={column.label} key={column.label}
            data-portfolio-column={column.label.toLowerCase()}
            sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 1.5, minWidth: 0 }}>
            <Typography component="h3" sx={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "-0.12px",
              color: "rgba(0,0,0,.48)", textTransform: "uppercase", px: 1, pb: 1 }}>
              {column.label} · {column.cards.length}
            </Typography>
            {column.cards.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)", px: 1 }}>
                No records
              </Typography>
            ) : column.cards.map((card) => {
              const aging = card.ageHours !== null && card.ageHours > AGING_STALE_HOURS &&
                !["completed", "assigned"].includes(card.status);
              return (
                <Box component={Link} to={card.to} key={card.id} data-portfolio-record={card.id}
                  sx={{ display: "block", bgcolor: "#fff", borderRadius: "8px", p: 1.25, mb: 1,
                    textDecoration: "none", color: "inherit", minWidth: 0,
                    "&:hover": { bgcolor: "#fafafc" },
                    "&:focus-visible": { outline: "2px solid #0071e3", outlineOffset: "2px" },
                  }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.12px", color: "#0066cc",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {card.code}
                  </Typography>
                  <Typography sx={{ fontSize: 12, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)",
                    mb: 0.5, overflowWrap: "anywhere" }}>
                    {card.title}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
                    <Typography component="span" sx={{ fontSize: 12, fontWeight: 500, letterSpacing: "-0.12px",
                      display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                      <Dot status={card.status} />{card.status.replace(/_/g, " ")}
                    </Typography>
                    <Typography component="span" sx={{ fontSize: 11.5, letterSpacing: "-0.12px",
                      color: "rgba(0,0,0,.48)", fontVariantNumeric: "tabular-nums" }}>
                      {card.ageLabel}
                    </Typography>
                  </Box>
                  {aging ? <Typography sx={{ fontSize: 11.5, letterSpacing: "-0.12px", color: "#b66a00", mt: 0.5 }}>
                    Over 24 h
                  </Typography> : null}
                  {card.batchBestPce !== null ? <Typography sx={{ fontSize: 12.5, fontWeight: 600,
                    letterSpacing: "-0.12px", mt: 0.5, fontVariantNumeric: "tabular-nums" }}>
                    {card.batchBestPce.toFixed(2)}% batch best forward PCE
                  </Typography> : null}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontSize: 12.5, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)", px: 0.5, pt: 1 }}>
        {total} records in the pipeline · amber text marks pending records older than 24 h
      </Typography>
    </Box>
  );
}
