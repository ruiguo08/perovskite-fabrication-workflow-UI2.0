import { useEffect, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { apiFetch } from "../lib/api";
import { useLanguage, localizeKnownError } from "../i18n";

/* Persistent pipeline header (phase 2, N1): Plans → Fabrication →
   Characterization with live counts, shown on every Laboratory page so the
   nav expresses where "now" is in the workflow. Counts refetch on each
   navigation; unavailable counts show an error and can be retried without
   interrupting navigation. */

interface Stage {
  label: string;
  path: string;
  count: number | null;
  detail: string;
  key: "plans" | "fabrication" | "characterization";
}

const LABORATORY_PREFIXES = ["/experiments", "/fabrication-batches", "/results", "/analysis", "/workflow"];

function isWithin(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isLaboratoryPage(pathname: string): boolean {
  if (pathname === "/" || pathname === "/app" || pathname === "/app/") {
    return true;
  }
  return LABORATORY_PREFIXES.some(
    (prefix) => isWithin(pathname, prefix),
  );
}

function currentStage(pathname: string): Stage["key"] {
  if (isWithin(pathname, "/fabrication-batches") || /^\/experiments\/[^/]+\/batches(\/|$)/.test(pathname)) {
    return "fabrication";
  }
  if (isWithin(pathname, "/results") || isWithin(pathname, "/analysis") || /^\/experiments\/[^/]+\/upload(\/|$)/.test(pathname)) {
    return "characterization";
  }
  return "plans";
}

interface ExperimentRow {
  plan_status?: string | null;
}

interface BatchRow {
  status?: string | null;
}

interface PipelineCounts {
  plans: number;
  released: number;
  batches: number;
  inProgress: number;
  results: number;
}

export function PipelineHeader() {
  const { t } = useLanguage();
  const location = useLocation();
  const [counts, setCounts] = useState<PipelineCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isLaboratoryPage(location.pathname)) {
      return;
    }
    let cancelled = false;
    async function load() {
      setCounts(null);
      setError(null);
      try {
        const [experimentRows, batchRows, resultRows] = await Promise.all([
          apiFetch<ExperimentRow[]>("/api/experiments"),
          apiFetch<BatchRow[]>("/api/fabrication-batches"),
          apiFetch<unknown[]>("/api/results"),
        ]);
        if (cancelled) {
          return;
        }
        setCounts({
          plans: experimentRows.length,
          released: experimentRows.filter((row) => row.plan_status === "released").length,
          batches: batchRows.length,
          inProgress: batchRows.filter((row) => row.status === "in_progress").length,
          results: resultRows.length,
        });
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "The count service did not respond.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, attempt]);

  if (!isLaboratoryPage(location.pathname)) {
    return null;
  }

  const activeStage = currentStage(location.pathname);

  const stages: Stage[] = [
    {
      label: t("pipeline.plans"),
      key: "plans",
      path: "/experiments",
      count: counts?.plans ?? null,
      detail: counts ? t("pipeline.released", { n: counts.released }) : "",
    },
    {
      label: t("pipeline.fabrication"),
      key: "fabrication",
      path: "/fabrication-batches",
      count: counts?.batches ?? null,
      detail: counts && counts.inProgress > 0 ? t("pipeline.inProgress", { n: counts.inProgress }) : "",
    },
    {
      label: t("pipeline.characterization"),
      key: "characterization",
      path: "/results",
      count: counts?.results ?? null,
      detail: "",
    },
  ];

  return (
    <Box
      component="nav"
      aria-label={t("pipeline.label")}
      data-pipeline-header="true"
      sx={{ maxWidth: 1280, width: "100%", minWidth: 0, mx: "auto", px: 3, pt: 2.5 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        {stages.map((stage, index) => (
          <Box key={stage.key} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {index > 0 ? (
              <Typography component="span" sx={{ color: "rgba(0,0,0,.3)", letterSpacing: "-0.224px", px: 0.5 }} aria-hidden>
                →
              </Typography>
            ) : null}
            <Box
              component={RouterLink}
              to={stage.path}
              aria-current={stage.key === activeStage ? "page" : undefined}
              sx={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: "980px",
                textDecoration: "none",
                bgcolor: stage.key === activeStage ? "rgba(0,113,227,.10)" : "#f5f5f7",
                color: stage.key === activeStage ? "#0066cc" : "rgba(0,0,0,.8)",
                "&:hover": { bgcolor: stage.key === activeStage ? "rgba(0,113,227,.14)" : "#e8e8ed" },
              }}
            >
              <Typography component="span" sx={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.224px" }}>
                {stage.label}
              </Typography>
              <Typography
                component="span"
                sx={{ fontSize: 15, fontWeight: 400, letterSpacing: "-0.224px", fontVariantNumeric: "tabular-nums",
                  color: stage.key === activeStage ? "#0066cc" : "rgba(0,0,0,.48)" }}
              >
                {counts ? stage.count : error ? "—" : "…"}
              </Typography>
              {stage.detail ? (
                <Typography component="span" sx={{ fontSize: 12.5, color: "rgba(0,0,0,.48)", letterSpacing: "-0.12px" }}>
                  {stage.detail}
                </Typography>
              ) : null}
            </Box>
          </Box>
        ))}
        {error ? (
          <Box role="alert" sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
            <Typography component="span" sx={{ fontSize: 12.5, letterSpacing: "-0.12px", color: "rgba(0,0,0,.8)" }}>
              {t("pipeline.failed")} {localizeKnownError(error)}
            </Typography>
            <Button size="small" onClick={() => setAttempt((value) => value + 1)} sx={{ fontSize: 12.5, letterSpacing: "-0.12px" }}>
              {t("pipeline.retry")}
            </Button>
          </Box>
        ) : counts ? null : (
          <Typography component="span" sx={{ fontSize: 12.5, letterSpacing: "-0.12px", color: "rgba(0,0,0,.48)" }} role="status">
            {t("pipeline.loading")}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
