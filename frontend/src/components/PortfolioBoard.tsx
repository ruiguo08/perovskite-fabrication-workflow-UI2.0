import { useMemo } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { formatRelativeTime } from "../lib/format";
import type {
  FabricationBatchListItem,
  ResultListItem,
} from "../types/api";

/* Narrow structural types so callers with richer (or locally declared)
   experiment objects remain assignable. */
interface BoardExperiment {
  id: number;
  experiment_code: string | null;
  status: string;
  plan_status: string | null;
  updated_at: string;
  best_pce?: number | null;
}

/* Portfolio board (phase 4, N5/D1): the Overview becomes a kanban of the
   whole pipeline — one column per stage, one card per record, aging from
   the record's own timestamps, measured best PCE pulled forward onto
   characterization and fabrication cards. Pure client-side aggregation
   over the same list endpoints the page already loads. */

const AGING_STALE_HOURS = 24;

interface BoardCard {
  id: string;
  code: string;
  title: string;
  status: string;
  statusColor: string;
  ageHours: number | null;
  ageLabel: string;
  to: string;
  bestPce: number | null;
}

const STATUS_COLOR: Record<string, string> = {
  draft: "#6852b8",
  pending_approval: "#b66a00",
  approved: "#168a9d",
  released: "#168a9d",
  suggested: "#8a97a0",
  ready: "#168a9d",
  in_progress: "#168a9d",
  running: "#168a9d",
  completed: "#1e7a4d",
  consumed: "#1e7a4d",
  cancelled: "#8a97a0",
  failed: "#b3261e",
  assigned: "#1e7a4d",
  unassigned: "#b66a00",
};

function ageHoursFrom(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  return (Date.now() - parsed) / 3_600_000;
}

function Dot({ status }: { status: string }) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{ width: 7, height: 7, borderRadius: "50%", flex: "none",
        bgcolor: STATUS_COLOR[status] ?? "#8a97a0", display: "inline-block" }}
    />
  );
}

interface PortfolioBoardProps {
  experiments: BoardExperiment[];
  batches: FabricationBatchListItem[];
  results: ResultListItem[];
}

export function PortfolioBoard({ experiments, batches, results }: PortfolioBoardProps) {
  const columns = useMemo(() => {
    const experimentById = new Map(experiments.map((row) => [row.id, row]));

    const planning: BoardCard[] = experiments
      .filter((row) => !["completed", "cancelled"].includes(row.status))
      .filter((row) => ["draft", "pending_approval", "suggested"].includes(row.plan_status ?? ""))
      .map((row) => ({
        id: `experiment-${row.id}`,
        code: row.experiment_code ?? `Experiment ${row.id}`,
        title: `Plan ${row.plan_status?.replace(/_/g, " ")}`,
        status: row.plan_status ?? "unknown",
        statusColor: STATUS_COLOR[row.plan_status ?? ""] ?? "#8a97a0",
        ageHours: ageHoursFrom(row.updated_at),
        ageLabel: `updated ${formatRelativeTime(row.updated_at)}`,
        to: `/experiments/${row.id}`,
        bestPce: null,
      }));

    const approved: BoardCard[] = experiments
      .filter((row) => ["approved", "released"].includes(row.plan_status ?? ""))
      .filter((row) => row.status !== "completed")
      .map((row) => {
        const hasActiveBatch = batches.some(
          (batch) => batch.experiment_id === row.id && batch.status !== "cancelled",
        );
        return {
          id: `experiment-${row.id}`,
          code: row.experiment_code ?? `Experiment ${row.id}`,
          title: hasActiveBatch ? "Batch ready" : "Awaiting batch",
          status: row.plan_status ?? "unknown",
          statusColor: STATUS_COLOR[row.plan_status ?? ""] ?? "#8a97a0",
          ageHours: ageHoursFrom(row.updated_at),
          ageLabel: `updated ${formatRelativeTime(row.updated_at)}`,
          to: `/experiments/${row.id}`,
          bestPce: null,
        };
      });

    const fabrication: BoardCard[] = batches
      .filter((row) => ["ready", "in_progress"].includes(row.status))
      .map((row) => {
        const experiment = experimentById.get(row.experiment_id);
        return {
          id: `batch-${row.id}`,
          code: row.batch_code,
          title: experiment?.experiment_code ?? `Experiment ${row.experiment_id}`,
          status: row.status,
          statusColor: STATUS_COLOR[row.status] ?? "#8a97a0",
          ageHours: ageHoursFrom(row.started_at ?? row.updated_at),
          ageLabel: row.started_at
            ? `${Math.round(ageHoursFrom(row.started_at) ?? 0)} h in batch`
            : `updated ${formatRelativeTime(row.updated_at)}`,
          to: `/experiments/${row.experiment_id}/batches/${row.id}`,
          bestPce: null,
        };
      });

    const characterization: BoardCard[] = results.map((row) => {
      const experiment = experimentById.get(row.experiment_id);
      const owningBatch = batches.find((batch) => batch.id === row.fabrication_batch_id);
      const ageHours = ageHoursFrom(row.created_at);
      return {
        id: `result-${row.id}`,
        code: row.filename,
        title: experiment?.experiment_code ?? `Experiment ${row.experiment_id}`,
        status: row.group_assignment ? "assigned" : "unassigned",
        statusColor: STATUS_COLOR[row.group_assignment ? "assigned" : "unassigned"],
        ageHours,
        ageLabel: `uploaded ${formatRelativeTime(row.created_at)}`,
        to: `/results/${row.id}`,
        bestPce: owningBatch?.best_pce ?? experiment?.best_pce ?? null,
      };
    });

    return [
      { label: "Planning", cards: planning },
      { label: "Approved", cards: approved },
      { label: "Fabrication", cards: fabrication },
      { label: "Characterization", cards: characterization },
    ];
  }, [experiments, batches, results]);

  const total = columns.reduce((sum, column) => sum + column.cards.length, 0);

  return (
    <Box data-portfolio-board="true">
      <Box sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        gap: 1.5,
      }}>
        {columns.map((column) => (
          <Box key={column.label} sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 1.5, minWidth: 0 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".05px",
              color: "rgba(0,0,0,.48)", px: 1, pb: 1 }}>
              {column.label.toUpperCase()} · {column.cards.length}
            </Typography>
            {column.cards.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: "#a39e98", px: 1 }}>—</Typography>
            ) : (
              column.cards.map((card) => {
                // Aging: a card still in flight past 24 h gets an amber edge.
                const aging =
                  card.ageHours !== null &&
                  card.ageHours > AGING_STALE_HOURS &&
                  !["completed", "consumed", "assigned"].includes(card.status);
                return (
                  <Box
                    key={card.id}
                    component={Link}
                    to={card.to}
                    sx={{
                      display: "block", bgcolor: "#fff", borderRadius: "10px",
                      p: 1.25, mb: 1, textDecoration: "none", color: "inherit",
                      borderLeft: aging ? "3px solid #b66a00" : "3px solid transparent",
                      boxShadow: "rgba(0,0,0,.04) 0 1px 3px",
                      "&:hover": { boxShadow: "rgba(0,0,0,.10) 0 2px 8px" },
                    }}
                  >
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "-0.12px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {card.code}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "rgba(0,0,0,.48)",
                      letterSpacing: "-0.12px", mb: 0.5 }}>
                      {card.title}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                      <Typography component="span" sx={{ fontSize: 12, fontWeight: 500,
                        display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                        <Dot status={card.status} />
                        {card.status.replace(/_/g, " ")}
                      </Typography>
                      <Typography component="span" sx={{ fontSize: 11.5, color: "rgba(0,0,0,.48)",
                        fontVariantNumeric: "tabular-nums" }}>
                        {card.ageLabel}
                      </Typography>
                    </Box>
                    {card.bestPce !== null ? (
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, mt: 0.5,
                        fontVariantNumeric: "tabular-nums" }}>
                        {card.bestPce.toFixed(2)}% best PCE
                      </Typography>
                    ) : null}
                  </Box>
                );
              })
            )}
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontSize: 12.5, color: "rgba(0,0,0,.48)", px: 0.5, pt: 1 }}>
        {total} records in the pipeline · amber edge marks records in flight for over 24 h
      </Typography>
    </Box>
  );
}
