import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Drawer from "@mui/material/Drawer";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

/* Run-sheet checklist (phase 1): one compact MUI table replaces the
   card-per-record flow. Status chips cycle through the legal transitions on
   click (same machine as the old per-row selects — helpers.ts stays the
   source of truth); "Record all as planned" stays a server round-trip; the
   deviation drawer replaces the per-row JSON form with structured fields. */

const PREPARATION_CYCLE: Record<string, string> = {
  planned: "preparing",
  preparing: "ready",
  ready: "consumed",
};
const EXECUTION_CYCLE: Record<string, string> = {
  planned: "ready",
  ready: "running",
  running: "completed",
};
const TONE_BY_STATUS: Record<string, "success" | "info" | "planned" | "warning" | "neutral"> = {
  consumed: "success",
  completed: "success",
  ready: "info",
  running: "info",
  preparing: "planned",
  planned: "planned",
  discarded: "neutral",
  cancelled: "neutral",
  failed: "warning",
};
const DOT_COLOR: Record<string, string> = {
  success: "#1e7a4d",
  info: "#168a9d",
  planned: "#6852b8",
  warning: "#b66a00",
  neutral: "#8a97a0",
};

export interface RunSheetRow {
  kind: "preparation" | "execution";
  id: number;
  code: string;
  title: string;
  meta: string;
  planned: string;
  status: string;
  recorded: boolean;
  notes: string;
}

export interface DeviationDraft {
  category: string;
  severity: string;
  description: string;
}

interface RunSheetTableProps {
  rows: RunSheetRow[];
  disabled: boolean;
  submitting: boolean;
  onCycle: (row: RunSheetRow, nextStatus: string) => void;
  onSaveDeviation: (row: RunSheetRow, draft: DeviationDraft) => Promise<void>;
}

function dot(status: string) {
  const tone = TONE_BY_STATUS[status] ?? "neutral";
  return (
    <Box
      component="span"
      sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: DOT_COLOR[tone], display: "inline-block", mr: 1 }}
      aria-hidden
    />
  );
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function RunSheetTable({ rows, disabled, submitting, onCycle, onSaveDeviation }: RunSheetTableProps) {
  const [drawerRow, setDrawerRow] = useState<RunSheetRow | null>(null);
  const [category, setCategory] = useState("process");
  const [severity, setSeverity] = useState("warning");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const done = useMemo(() => rows.filter((row) => ["consumed", "completed", "discarded", "cancelled", "failed"].includes(row.status)).length, [rows]);
  const pending = rows.length - done;

  function cycle(row: RunSheetRow) {
    if (disabled || submitting) return;
    const machine = row.kind === "preparation" ? PREPARATION_CYCLE : EXECUTION_CYCLE;
    const next = machine[row.status];
    if (next) {
      onCycle(row, next);
    }
  }

  async function saveDeviation() {
    if (!drawerRow || !description.trim()) {
      setError("Describe what changed.");
      return;
    }
    setError(null);
    try {
      await onSaveDeviation(drawerRow, { category, severity, description: description.trim() });
      setDrawerRow(null);
      setDescription("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the deviation.");
    }
  }

  const prepRows = rows.filter((row) => row.kind === "preparation");
  const execRows = rows.filter((row) => row.kind === "execution");

  const renderGroup = (title: string, group: RunSheetRow[]) =>
    group.length > 0 ? (
      <>
        <TableRow sx={{ "& td": { border: 0, pb: 0.5, pt: 2 } }}>
          <TableCell colSpan={5}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.224px" }}>{title}</Typography>
          </TableCell>
        </TableRow>
        {group.map((row) => (
          <TableRow key={`${row.kind}-${row.id}`} hover data-runsheet-row={`${row.kind}-${row.id}`}>
            <TableCell sx={{ color: "rgba(0,0,0,.48)", whiteSpace: "nowrap" }}>{row.code}</TableCell>
            <TableCell>
              <Typography sx={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.12px" }}>{row.title}</Typography>
              <Typography sx={{ fontSize: 12, color: "rgba(0,0,0,.48)", letterSpacing: "-0.12px" }}>{row.meta}</Typography>
            </TableCell>
            <TableCell align="right" sx={{ color: "rgba(0,0,0,.8)", whiteSpace: "nowrap" }}>{row.planned}</TableCell>
            <TableCell sx={{ whiteSpace: "nowrap" }}>
              <Chip
                data-runsheet-status={`${row.kind}-${row.id}`}
                icon={dot(row.status)}
                label={statusLabel(row.status)}
                onClick={() => cycle(row)}
                size="small"
                sx={{
                  cursor: disabled || submitting ? "default" : "pointer",
                  bgcolor: "transparent",
                  border: 0,
                  pl: 0.5,
                  "& .MuiChip-label": { px: 0.5 },
                }}
              />
            </TableCell>
            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
              {row.recorded ? null : (
                <Chip size="small" label="not recorded" sx={{ bgcolor: "rgba(0,0,0,.05)", mr: 1, border: 0 }} />
              )}
              <Button
                size="small"
                color="inherit"
                data-runsheet-deviation={`${row.kind}-${row.id}`}
                sx={{ fontSize: 12.5, fontWeight: 500 }}
                onClick={() => {
                  setDrawerRow(row);
                  setCategory("process");
                  setSeverity("warning");
                  setDescription("");
                  setError(null);
                }}
              >
                Deviation
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </>
    ) : null;

  return (
    <Box data-runsheet-table="true">
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", bgcolor: "#f5f5f7", borderRadius: "12px", px: 2, py: 1.5, mb: 2 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.224px", whiteSpace: "nowrap" }}>
          {done} of {rows.length} recorded
        </Typography>
        <LinearProgress variant="determinate" value={rows.length ? (done / rows.length) * 100 : 0} sx={{ flex: 1 }} />
        <Button variant="contained" data-runsheet-bulk="true" disabled={disabled || submitting || pending === 0}
          sx={{ whiteSpace: "nowrap" }}>
          Record all as planned
        </Button>
      </Stack>

      <Table size="small" aria-label="Run sheet checklist">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 56 }}>Step</TableCell>
            <TableCell>Detail</TableCell>
            <TableCell align="right" sx={{ width: 90 }}>Planned</TableCell>
            <TableCell sx={{ width: 170 }}>Status — click to cycle</TableCell>
            <TableCell align="right" sx={{ width: 170 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {renderGroup("Solution preparations", prepRows)}
          {renderGroup("Process executions", execRows)}
        </TableBody>
      </Table>

      <Drawer
        anchor="right"
        open={drawerRow !== null}
        onClose={() => setDrawerRow(null)}
        slotProps={{ paper: { sx: { p: "22px 24px", width: 400 } } }}
      >
        <Typography component="h2" sx={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.224px", mb: 0.5 }}>
          Record deviation
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: "rgba(0,0,0,.48)", mb: 2 }}>
          {drawerRow ? `${drawerRow.code} · ${drawerRow.title}` : ""}
        </Typography>
        <Stack spacing={2}>
          <TextField
            select
            size="small"
            label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {["process", "material", "equipment", "substrate", "device", "operator", "other"].map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Severity"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            {["info", "warning", "error", "critical"].map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="What changed"
            multiline
            minRows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. spin speed 4000 rpm instead of 5000 rpm"
          />
          {error ? <Typography sx={{ fontSize: 13, color: "#b3261e" }}>{error}</Typography> : null}
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" data-runsheet-deviation-save="true" onClick={() => void saveDeviation()}>
              Save deviation
            </Button>
            <Button color="inherit" onClick={() => setDrawerRow(null)}>Cancel</Button>
          </Stack>
        </Stack>
      </Drawer>
    </Box>
  );
}
