import { useEffect, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { apiFetch } from "../lib/api";

/* Persistent pipeline header (phase 2, N1): Plans → Fabrication →
   Characterization with live counts, shown on every Laboratory page so the
   nav expresses where "now" is in the workflow. Counts refetch on each
   navigation; on API failure the header hides — the sidebar stays the
   fallback navigation. */

interface Stage {
  label: string;
  path: string;
  count: number | null;
  detail: string;
  match: (pathname: string) => boolean;
}

const LABORATORY_PREFIXES = ["/experiments", "/fabrication-batches", "/results", "/workflow"];

function isLaboratoryPage(pathname: string): boolean {
  if (pathname === "/" || pathname === "/app" || pathname.endsWith("/app")) {
    return true;
  }
  return LABORATORY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

interface ExperimentRow {
  plan_status?: string | null;
}

interface BatchRow {
  status?: string | null;
}

export function PipelineHeader() {
  const location = useLocation();
  const [experiments, setExperiments] = useState<ExperimentRow[] | null>(null);
  const [batchCount, setBatchCount] = useState<number | null>(null);
  const [inProgress, setInProgress] = useState<number | null>(null);
  const [resultCount, setResultCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isLaboratoryPage(location.pathname)) {
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [experimentRows, batchRows, resultRows] = await Promise.all([
          apiFetch<ExperimentRow[]>("/api/experiments"),
          apiFetch<BatchRow[]>("/api/fabrication-batches"),
          apiFetch<unknown[]>("/api/results"),
        ]);
        if (cancelled) {
          return;
        }
        setExperiments(experimentRows);
        setBatchCount(batchRows.length);
        setInProgress(batchRows.filter((row) => row.status === "in_progress").length);
        setResultCount(resultRows.length);
      } catch {
        if (!cancelled) {
          setExperiments(null);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (!isLaboratoryPage(location.pathname)) {
    return null;
  }

  const planTotal = experiments?.length ?? null;
  const released = experiments?.filter((row) => row.plan_status === "released").length ?? null;
  const loaded = planTotal !== null && batchCount !== null && resultCount !== null;

  const stages: Stage[] = [
    {
      label: "Plans",
      path: "/experiments",
      count: planTotal,
      detail: released !== null ? `${released} released` : "",
      match: (p) => p.startsWith("/experiments") || p === "/" || p.endsWith("/app") || p.startsWith("/workflow"),
    },
    {
      label: "Fabrication",
      path: "/fabrication-batches",
      count: batchCount,
      detail: inProgress !== null && inProgress > 0 ? `${inProgress} in progress` : "",
      match: (p) => p.startsWith("/fabrication-batches") || /\/batches(\/|$)/.test(p),
    },
    {
      label: "Characterization",
      path: "/results",
      count: resultCount,
      detail: "",
      match: (p) => p.startsWith("/results"),
    },
  ];

  return (
    <Box
      component="nav"
      aria-label="Workflow pipeline"
      data-pipeline-header="true"
      sx={{ maxWidth: 1280, width: "100%", mx: "auto", px: 3, pt: 2.5 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        {stages.map((stage, index) => (
          <Box key={stage.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {index > 0 ? (
              <Typography component="span" sx={{ color: "rgba(0,0,0,.3)", px: 0.5 }} aria-hidden>
                →
              </Typography>
            ) : null}
            <Box
              component={RouterLink}
              to={stage.path}
              sx={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: "980px",
                textDecoration: "none",
                bgcolor: stage.match(location.pathname) ? "rgba(0,113,227,.10)" : "#f5f5f7",
                color: stage.match(location.pathname) ? "#0066cc" : "rgba(0,0,0,.8)",
                "&:hover": { bgcolor: stage.match(location.pathname) ? "rgba(0,113,227,.14)" : "#e8e8ed" },
              }}
            >
              <Typography component="span" sx={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.224px" }}>
                {stage.label}
              </Typography>
              <Typography
                component="span"
                sx={{ fontSize: 15, fontWeight: 400, fontVariantNumeric: "tabular-nums",
                  color: stage.match(location.pathname) ? "#0066cc" : "rgba(0,0,0,.48)" }}
              >
                {loaded ? stage.count : "…"}
              </Typography>
              {stage.detail ? (
                <Typography component="span" sx={{ fontSize: 12.5, color: "rgba(0,0,0,.48)", letterSpacing: "-0.12px" }}>
                  {stage.detail}
                </Typography>
              ) : null}
            </Box>
          </Box>
        ))}
        {loaded ? null : (
          <Typography component="span" sx={{ fontSize: 12.5, color: "rgba(0,0,0,.48)" }} role="status">
            Loading pipeline…
          </Typography>
        )}
      </Box>
    </Box>
  );
}
