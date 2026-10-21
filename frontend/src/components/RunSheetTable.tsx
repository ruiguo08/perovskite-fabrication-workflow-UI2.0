import { enumLabel, localizeAppText } from "../i18n";
import { useMemo } from "react";
import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useRef, useState } from "react";
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
  preparing: "info",
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
  onRecordAllAsPlanned: () => void;
  onSaveDeviation: (row: RunSheetRow, draft: DeviationDraft) => Promise<void>;
}

function dot(status: string) {
  const tone = TONE_BY_STATUS[status] ?? "neutral";
  return (
    <Box
      component="span"
      sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: DOT_COLOR[tone], display: "inline-block" }}
      aria-hidden
    />
  );
}

function statusLabel(status: string) {
  return enumLabel(status);
}

export function RunSheetTable({ rows, disabled, submitting, onCycle, onRecordAllAsPlanned, onSaveDeviation }: RunSheetTableProps) {
  useUiLanguage();
  const [drawerRow, setDrawerRow] = useState<RunSheetRow | null>(null);
  const [category, setCategory] = useState("process");
  const [severity, setSeverity] = useState("warning");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savingDeviation, setSavingDeviation] = useState(false);
  const deviationInFlight = useRef(false);

  const done = useMemo(() => rows.filter((row) => row.recorded).length, [rows]);
  const pending = rows.filter((row) => !row.recorded &&
    !["consumed", "completed", "discarded", "cancelled", "failed"].includes(row.status)).length;

  function cycle(row: RunSheetRow) {
    if (disabled || submitting) return;
    const machine = row.kind === "preparation" ? PREPARATION_CYCLE : EXECUTION_CYCLE;
    const next = machine[row.status];
    if (next) {
      onCycle(row, next);
    }
  }

  async function saveDeviation() {
    if (disabled || submitting || deviationInFlight.current) return;
    if (!drawerRow || !description.trim()) {
      setError("Describe what changed.");
      return;
    }
    setError(null);
    deviationInFlight.current = true;
    setSavingDeviation(true);
    try {
      await onSaveDeviation(drawerRow, { category, severity, description: description.trim() });
      setDrawerRow(null);
      setDescription("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the deviation.");
    } finally {
      deviationInFlight.current = false;
      setSavingDeviation(false);
    }
  }

  const prepRows = rows.filter((row) => row.kind === "preparation");
  const execRows = rows.filter((row) => row.kind === "execution");

  const renderGroup = (title: string, group: RunSheetRow[]) =>
    group.length > 0 ? (
      <>
        <TableRow sx={{ "& td": { border: 0, pb: 0.5, pt: 2 } }}>
          <TableCell colSpan={4}>
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
            <TableCell sx={{ whiteSpace: "nowrap" }}>
              <Chip
                data-runsheet-status={`${row.kind}-${row.id}`}
                icon={dot(row.status)}
                label={statusLabel(row.status)}
                onClick={(row.kind === "preparation" ? PREPARATION_CYCLE : EXECUTION_CYCLE)[row.status]
                  ? () => cycle(row) : undefined}
                disabled={disabled || submitting || savingDeviation}
                size="small"
                sx={{
                  cursor: disabled || submitting ? "default" : "pointer",
                  bgcolor: "transparent",
                  border: 0,
                  px: 1,
                  "& .MuiChip-icon": { ml: 0, mr: "7px" },
                  "& .MuiChip-label": { px: 0 },
                }}
              />
            </TableCell>
            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
              {row.recorded ? null : (
                <Chip size="small" label={tr("runSheetTable.notRecorded")} sx={{ bgcolor: "rgba(0,0,0,.05)", mr: 1, border: 0 }} />
              )}
              <Button
                size="small"
                color="inherit"
                disabled={disabled || submitting || savingDeviation}
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
                {tr("runSheetTable.deviation")}</Button>
            </TableCell>
          </TableRow>
        ))}
      </>
    ) : null;

  return (
    <Box data-runsheet-table="true">
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap", bgcolor: "#f5f5f7", borderRadius: "12px", px: 2, py: 1.5, mb: 2 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.224px", whiteSpace: "nowrap" }}>
          {done} {tr("runSheetTable.of")}{rows.length} {tr("runSheetTable.recorded")}</Typography>
        <LinearProgress variant="determinate" value={rows.length ? (done / rows.length) * 100 : 0} sx={{ flex: 1 }} />
        <Button variant="contained" data-runsheet-bulk="true" disabled={disabled || submitting || pending === 0}
          onClick={onRecordAllAsPlanned}
          sx={{ whiteSpace: "nowrap" }}>
          {tr("runSheetTable.recordAllAsPlanned")}</Button>
      </Stack>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" aria-label={tr("runSheetTable.runSheetChecklist")}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 56 }}>{tr("runSheetTable.step")}</TableCell>
              <TableCell>{tr("runSheetTable.detail")}</TableCell>
              <TableCell sx={{ width: 170 }}>{tr("runSheetTable.statusClickToCycle")}</TableCell>
              <TableCell align="right" sx={{ width: 170 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {renderGroup("Solution preparations", prepRows)}
            {renderGroup("Process executions", execRows)}
          </TableBody>
        </Table>
      </Box>

      <Drawer
        anchor="right"
        open={drawerRow !== null}
        onClose={() => { if (!deviationInFlight.current) setDrawerRow(null); }}
        slotProps={{ paper: {
          role: "dialog", "aria-modal": true, "aria-labelledby": "run-sheet-deviation-title",
          sx: { p: "22px 24px", width: "min(400px, 100%)" },
        } }}
      >
        <Typography id="run-sheet-deviation-title" component="h2" sx={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.224px", mb: 0.5 }}>
          {tr("runSheetTable.recordDeviation")}</Typography>
        <Typography sx={{ fontSize: 12.5, color: "rgba(0,0,0,.48)", mb: 2 }}>
          {drawerRow ? `${drawerRow.code} · ${drawerRow.title}` : ""}
        </Typography>
        <Stack spacing={2}>
          <TextField
            select
            autoFocus
            disabled={savingDeviation}
            size="small"
            label={tr("runSheetTable.category")}
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
            label={tr("runSheetTable.severity")}
            disabled={savingDeviation}
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            {["info", "warning", "error", "critical"].map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
          <TextField
            label={tr("runSheetTable.whatChanged")}
            disabled={savingDeviation}
            multiline
            minRows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={tr("runSheetTable.eGSpinSpeedRpmInsteadOfRpm")}
          />
          {error ? <Typography sx={{ fontSize: 13, color: "#b3261e" }}>{localizeAppText(error ?? "")}</Typography> : null}
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" data-runsheet-deviation-save="true" disabled={disabled || submitting || savingDeviation} onClick={() => void saveDeviation()}>
              {savingDeviation ? tr("runSheetTable.saving") : tr("runSheetTable.saveDeviation")}
            </Button>
            <Button color="inherit" disabled={savingDeviation} onClick={() => setDrawerRow(null)}>{tr("completeBatchDialog.cancel")}</Button>
          </Stack>
        </Stack>
      </Drawer>
    </Box>
  );
}
