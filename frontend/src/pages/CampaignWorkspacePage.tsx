import { enumLabel, localizeAppText } from "../i18n";
import { useMemo } from "react";
import { translate as tr, useLanguage as useUiLanguage, useLocalizedMemo } from "../i18n";
import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageHeader } from "../components/PageHeader";
import { apiFetch } from "../lib/api";
import { formatRelativeTime } from "../lib/format";
import type { Campaign, Experiment, FabricationBatchListItem, ResultListItem } from "../types/api";

/* Campaign workspace (phase 2, N3): a master-detail view of one campaign —
   the left rail groups its experiments, batches, and results by pipeline
   stage; the right pane shows the selected record with a contextual
   breadcrumb (Campaign › stage › record) and a link to its full page. */

type Stage = "planning" | "fabrication" | "characterization";

interface Selection {
  stage: Stage;
  id: number;
}

interface CampaignRecord {
  stage: Stage;
  id: number;
  code: string;
  status: string;
  detail: string;
  linkTo: string;
  linkLabel: string;
}

const STATUS_TONE: Record<string, string> = {
  draft: "#6852b8",
  pending_approval: "#b66a00",
  approved: "#168a9d",
  released: "#168a9d",
  ready: "#168a9d",
  in_progress: "#168a9d",
  running: "#168a9d",
  completed: "#1e7a4d",
  consumed: "#1e7a4d",
  suggested: "#8a97a0",
  cancelled: "#8a97a0",
  failed: "#b3261e",
  closed: "#8a97a0",
  archived: "#8a97a0",
  active: "#168a9d",
  assigned: "#1e7a4d",
  unassigned: "#b66a00",
};

function Dot({ status }: { status: string }) {
  useUiLanguage();
  return (
    <Box
      component="span"
      aria-hidden
      sx={{ width: 7, height: 7, borderRadius: "50%", flex: "none",
        bgcolor: STATUS_TONE[status] ?? "#8a97a0", display: "inline-block" }}
    />
  );
}

const STAGE_LABELS: Record<Stage, string> = {
  planning: "Planning",
  fabrication: "Fabrication",
  characterization: "Characterization",
};

export function CampaignWorkspacePage() {
  useUiLanguage();
  const { code } = useParams();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [experiments, setExperiments] = useState<Experiment[] | null>(null);
  const [batches, setBatches] = useState<FabricationBatchListItem[] | null>(null);
  const [results, setResults] = useState<ResultListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setCampaigns(null);
      setExperiments(null);
      setBatches(null);
      setResults(null);
      setError(null);
      setSelection(null);
      try {
        const [campaignRows, experimentRows, batchRows, resultRows] = await Promise.all([
          apiFetch<Campaign[]>("/api/campaigns"),
          apiFetch<Experiment[]>("/api/experiments"),
          apiFetch<FabricationBatchListItem[]>("/api/fabrication-batches"),
          apiFetch<ResultListItem[]>("/api/results"),
        ]);
        if (cancelled) return;
        setCampaigns(campaignRows);
        setExperiments(experimentRows);
        setBatches(batchRows);
        setResults(resultRows);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load the campaign workspace.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const campaign = campaigns?.find((row) => row.code === code) ?? null;

  const records = useLocalizedMemo<CampaignRecord[]>(() => {
    if (!experiments || !batches || !results || !code) {
      return [];
    }
    const campaignExperiments = experiments.filter((row) => row.campaign_id === code);
    const experimentIds = new Set(campaignExperiments.map((row) => row.id));
    const campaignBatches = batches.filter((row) => experimentIds.has(row.experiment_id));
    const campaignResults = results.filter((row) => experimentIds.has(row.experiment_id));
    return [
      ...campaignExperiments.map((row) => ({
        stage: "planning" as Stage,
        id: row.id,
        code: row.experiment_code ?? `Experiment ${row.id}`,
        status: row.plan_status ?? row.status ?? "unknown",
        detail: tr("campaignWorkspacePage.planStatusUpdatedTime", { "status": row.plan_status ?? "—", "time": formatRelativeTime(row.updated_at) }),
        linkTo: `/experiments/${row.id}`,
        linkLabel: tr("campaignWorkspacePage.openExperiment"),
      })),
      ...campaignBatches.map((row) => ({
        stage: "fabrication" as Stage,
        id: row.id,
        code: row.batch_code,
        status: row.status,
        detail: row.experiment_code ?? tr("campaignWorkspacePage.experimentId", { "id": row.experiment_id }),
        linkTo: `/experiments/${row.experiment_id}/batches/${row.id}`,
        linkLabel: tr("campaignWorkspacePage.openRunSheet"),
      })),
      ...campaignResults.map((row) => ({
        stage: "characterization" as Stage,
        id: row.id,
        code: row.filename,
        status: row.group_assignment ? "assigned" : "unassigned",
        detail: row.experiment_code ?? tr("campaignWorkspacePage.experimentId", { "id": row.experiment_id }),
        linkTo: `/results/${row.id}`,
        linkLabel: tr("campaignWorkspacePage.openResult"),
      })),
    ];
  }, [experiments, batches, results, code]);

  const selected = useMemo(() => {
    if (!selection) return null;
    return records.find((row) => row.stage === selection.stage && row.id === selection.id) ?? null;
  }, [selection, records]);

  if (error) {
    return <ErrorState title={tr("campaignWorkspacePage.unableToLoadTheCampaignWorkspace")} message={localizeAppText(error ?? "")} />;
  }

  const loading = campaigns === null || experiments === null || batches === null || results === null;
  if (loading) {
    return <div className="page-loading" role="status">{tr("campaignWorkspacePage.loadingCampaignWorkspace")}</div>;
  }
  if (!campaign) {
    return <ErrorState title={tr("campaignWorkspacePage.campaignNotFound")} message={tr("campaignWorkspacePage.noCampaignWithCodeCode", { "code": code })} />;
  }

  const byStage = (stage: Stage) => records.filter((row) => row.stage === stage);
  const planning = byStage("planning");
  const fabrication = byStage("fabrication");
  const characterization = byStage("characterization");

  function select(record: CampaignRecord) {
    setSelection({ stage: record.stage, id: record.id });
  }

  const stageRail = (stage: Stage, group: CampaignRecord[]) => (
    <Box key={stage} sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)", px: 1, pb: 0.5 }}>
        {STAGE_LABELS[stage].toUpperCase()} · {group.length}
      </Typography>
      {group.length === 0 ? (
        <Typography sx={{ fontSize: 13, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)", px: 1, py: 0.5 }}>—</Typography>
      ) : (
        group.map((record) => {
          const active = selection?.stage === record.stage && selection?.id === record.id;
          return (
            <Box
              key={`${record.stage}-${record.id}`}
              component="button"
              type="button"
              aria-pressed={active}
              aria-controls="campaign-record-detail"
              onClick={() => select(record)}
              sx={{
                display: "flex", alignItems: "center", gap: 1, width: "100%", textAlign: "left",
                font: "inherit", fontSize: 13, letterSpacing: "-0.12px", border: 0, cursor: "pointer",
                px: 1, py: 0.75, borderRadius: "8px",
                bgcolor: active ? "rgba(0,113,227,.10)" : "transparent",
                color: active ? "#0066cc" : "rgba(0,0,0,.8)",
                "&:hover": { bgcolor: "rgba(0,0,0,.05)" },
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: active ? 600 : 400,
                  letterSpacing: "-0.12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {record.code}
                </Typography>
                <Typography component="span" sx={{ fontSize: 12, letterSpacing: "-0.12px", color: "rgba(0,0,0,.8)",
                  display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                  <Dot status={record.status} />
                  {enumLabel(record.status)}
                </Typography>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );

  return (
    <>
      <PageHeader
        title={campaign.display_name}
        description={tr("campaignWorkspacePage.codeStatusNRecordsInThePipeline", { "code": campaign.code, "status": campaign.status, "n": records.length })}
        actions={<RouterLink className="button button--secondary button--small" to="/campaigns">{tr("campaignWorkspacePage.allCampaigns")}</RouterLink>}
      />
      {records.length === 0 ? (
        <EmptyState
          title={tr("campaignWorkspacePage.nothingInThePipelineForThisCampaignYet")}
          description={tr("campaignWorkspacePage.experimentsAppearHereOnceAPlanIsCreatedUnder")}
        />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", minWidth: 0, gap: 2.5, alignItems: "start",
          "@media (max-width: 720px)": { gridTemplateColumns: "minmax(0, 1fr)" } }}>
          <Box component="nav" aria-label={tr("campaignWorkspacePage.campaignRecords")} sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 1.5, minWidth: 0 }}>
            {stageRail("planning", planning)}
            <Divider sx={{ borderColor: "rgba(0,0,0,.06)" }} />
            {stageRail("fabrication", fabrication)}
            <Divider sx={{ borderColor: "rgba(0,0,0,.06)" }} />
            {stageRail("characterization", characterization)}
          </Box>

          <Box component="section" id="campaign-record-detail" aria-label={tr("campaignWorkspacePage.recordDetails")}
            sx={{ bgcolor: "#f5f5f7", borderRadius: "12px", p: 2.5, minHeight: 240, minWidth: 0, overflowWrap: "anywhere" }}>
            <Typography role="status" aria-atomic sx={{ fontSize: 12.5, color: "rgba(0,0,0,.48)", letterSpacing: "-0.12px", mb: selected ? 0.5 : 0 }}>
              {selected ? tr("campaignWorkspacePage.campaignStageCode", { "Stage": STAGE_LABELS[selected.stage], "code": selected.code }) : ""}
            </Typography>
            {selected ? (
              <>
                <Typography component="h2" sx={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.28px", mb: 1 }}>
                  {selected.code}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 2, minWidth: 0 }}>
                  <Typography component="span" sx={{ fontSize: 13.5, fontWeight: 500, letterSpacing: "-0.12px",
                    display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                    <Dot status={selected.status} />
                    {enumLabel(selected.status)}
                  </Typography>
                  <Typography sx={{ fontSize: 13, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)", minWidth: 0 }}>· {selected.detail}</Typography>
                </Box>
                <Button component={RouterLink} to={selected.linkTo} variant="contained" sx={{ borderRadius: "8px", maxWidth: "100%", whiteSpace: "normal" }}>
                  {selected.linkLabel}
                </Button>
              </>
            ) : (
              <Stack sx={{ py: 4, alignItems: "center" }} spacing={1}>
                <Typography sx={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.224px" }}>{tr("campaignWorkspacePage.selectARecordFromTheLeftRail")}</Typography>
                <Typography sx={{ fontSize: 13, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)" }}>
                  {tr("campaignWorkspacePage.thePaneShowsItsPipelineStageStatusAndA")}</Typography>
              </Stack>
            )}
          </Box>
        </Box>
      )}
    </>
  );
}
