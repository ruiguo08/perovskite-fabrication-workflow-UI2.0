import { localizeAppText } from "../i18n";
import { useMemo } from "react";
import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../auth/session";
import { DeviceStackRail } from "../components/DeviceStackRail";
import { ErrorState } from "../components/ErrorState";
import { InlineFormError } from "../components/InlineFormError";
import { PageHeader } from "../components/PageHeader";
import { useToast } from "../components/Toast";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ConditionPlanner } from "../features/experiment-builder/ConditionPlanner";
import { experimentDraftStore } from "../features/experiment-builder/draftStorage";
import { LayerStackEditor } from "../features/experiment-builder/LayerStackEditor";
import { ReviewPanel } from "../features/experiment-builder/ReviewPanel";
import { StartingPointPanel } from "../features/experiment-builder/StartingPointPanel";
import { SubstratePanel } from "../features/experiment-builder/SubstratePanel";
import {
  applyDeviceLayout,
  createBlankDraft,
  expandBaseline,
  toExperimentPayload,
} from "../features/experiment-builder/state";
import type { ExperimentDraft } from "../features/experiment-builder/types";
import { validateDraft } from "../features/experiment-builder/validation";
import { apiFetch } from "../lib/api";
import { useApiResource } from "../lib/useApiResource";
import { useEditorConfig } from "../lib/useEditorConfig";
import { VCD_VALVES } from "../lib/constraints";
import type { Baseline, Campaign, DeviceLayout, LayerPreset, Material } from "../types/api";

type BuilderStep = "starting" | "substrate" | "layers" | "conditions" | "review";

interface BuilderCatalogs {
  campaigns: Campaign[];
  baselines: Baseline[];
  presets: LayerPreset[];
  materials: Material[];
  layouts: DeviceLayout[];
}

const STEPS: Array<{ id: BuilderStep; label: string; number: string }> = [
  { id: "starting", get label() { return tr("reviewPanel.startingPoint"); }, number: "01" },
  { id: "substrate", get label() { return tr("deviceExclusionsPanel.substrate"); }, number: "02" },
  { id: "layers", get label() { return tr("experimentBuilderPage.layerStack"); }, number: "03" },
  { id: "conditions", get label() { return tr("batchDetailPage.conditions"); }, number: "04" },
  { id: "review", get label() { return tr("experimentBuilderPage.review"); }, number: "05" },
];

function matchingLayout(baseline: Baseline, layouts: DeviceLayout[]): DeviceLayout | null {
  return layouts.find((layout) =>
    Number(layout.substrate_width_mm) === Number(baseline.device_recipe.substrate.width_mm)
    && Number(layout.substrate_length_mm) === Number(baseline.device_recipe.substrate.length_mm),
  ) ?? null;
}

export function ExperimentBuilderPage() {
  useUiLanguage();
  const { user } = useSession();
  const { show } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<BuilderStep>("starting");
  const [draft, setDraft] = useState<ExperimentDraft>(() => createBlankDraft());
  const [selectedBaselineId, setSelectedBaselineId] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const restoreAttempted = useRef(false);

  useEffect(() => {
    if (user === null || restoreAttempted.current) return;
    restoreAttempted.current = true;
    const stored = experimentDraftStore.load(user.id);
    if (stored !== null) {
      setDraft(stored);
      setRestoredDraft(true);
    }
  }, [user]);

  useEffect(() => {
    if (user === null) return;
    experimentDraftStore.save(user.id, draft);
  }, [user, draft]);

  function discardRestoredDraft() {
    if (user !== null) experimentDraftStore.clear(user.id);
    setDraft(createBlankDraft());
    setSelectedBaselineId("");
    setStep("starting");
    setRestoredDraft(false);
  }

  const loadCatalogs = useCallback(async (): Promise<BuilderCatalogs> => {
    const [campaigns, baselines, presets, materials, layouts] = await Promise.all([
      apiFetch<Campaign[]>("/api/campaigns"),
      apiFetch<Baseline[]>("/api/baselines"),
      apiFetch<LayerPreset[]>("/api/layer-presets"),
      apiFetch<Material[]>("/api/materials"),
      apiFetch<DeviceLayout[]>("/api/device-layouts"),
    ]);
    return { campaigns, baselines, presets, materials, layouts };
  }, []);
  const resource = useApiResource(loadCatalogs);
  const catalogs = resource.data;
  const editorConfigResource = useEditorConfig();
  const vcdValves = editorConfigResource.data?.vcd_valves ?? VCD_VALVES;
  const issues = useMemo(() => validateDraft(draft, { vcdValves }), [draft, vcdValves]);

  // Selecting a different starting point replaces the whole draft (and the
  // auto-persist effect then overwrites the stored copy), so destructive
  // changes require an explicit confirmation.
  const [pendingStartChange, setPendingStartChange] = useState<
    { kind: "baseline"; id: string } | { kind: "blank" } | null
  >(null);

  function draftHasRecordedContent(): boolean {
    return (
      draft.layers.length > 0 ||
      draft.conditions.length > 0 ||
      draft.substrate.material.trim() !== ""
    );
  }

  function selectBaseline(id: string) {
    if (!id || !catalogs || id === selectedBaselineId) {
      setSelectedBaselineId(id);
      return;
    }
    if (draftHasRecordedContent()) {
      setPendingStartChange({ kind: "baseline", id });
      return;
    }
    applyBaselineSelection(id);
  }

  function applyBaselineSelection(id: string) {
    setSelectedBaselineId(id);
    if (!id || !catalogs) return;
    const baseline = catalogs.baselines.find((item) => String(item.id) === id);
    if (!baseline) return;
    const layout = matchingLayout(baseline, catalogs.layouts);
    if (!layout) {
      setPageError("No device layout is available for this baseline.");
      return;
    }
    try {
      setDraft(expandBaseline(draft, baseline, layout));
      setRestoredDraft(false);
      setPageError(null);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to expand the selected baseline.");
    }
  }

  function startBlank() {
    if (!catalogs) return;
    if (draftHasRecordedContent()) {
      setPendingStartChange({ kind: "blank" });
      return;
    }
    applyStartBlank();
  }

  function applyStartBlank() {
    if (!catalogs) return;
    let next = createBlankDraft();
    next.campaign_id = draft.campaign_id;
    if (catalogs.layouts[0]) next = applyDeviceLayout(next, catalogs.layouts[0]);
    next = { ...next, plan_type: "standalone", conditions: next.conditions.slice(0, 1).map((condition) => ({ ...condition, group_id: "standalone", kind: "standalone", name: "Standalone condition" })) };
    setDraft(next);
    setSelectedBaselineId("");
    setRestoredDraft(false);
    setPageError(null);
  }

  async function saveExperiment() {
    if (issues.length > 0) {
      setStep("review");
      setPageError("Complete the review items before saving this experiment.");
      return;
    }
    setSubmitting(true);
    setPageError(null);
    try {
      const created = await apiFetch<{ id: number }>("/api/experiments", {
        method: "POST",
        body: toExperimentPayload(draft),
      });
      if (user !== null) experimentDraftStore.clear(user.id);
      show("Experiment saved with complete expanded snapshots.", "success");
      navigate(`/experiments/${created.id}`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to save the experiment.");
      setStep("review");
    } finally {
      setSubmitting(false);
    }
  }

  if (resource.status === "loading" && resource.data === null) {
    return <div className="page-loading" role="status">{tr("experimentBuilderPage.loadingExperimentPlanningCatalogs")}</div>;
  }
  if (resource.status === "error" && resource.data === null) {
    return <ErrorState title={tr("experimentBuilderPage.unableToLoadThePlanningWorkspace")} message={resource.error ?? tr("experimentBuilderPage.theReusableDirectoriesDidNotRespond")} action={<button type="button" className="button button--secondary" onClick={() => void resource.reload()}>{tr("versionHistory.retry")}</button>} />;
  }
  if (!catalogs || !user) return null;

  return (
    <>
      <PageHeader title={tr("experimentBuilderPage.planExperiment")} description={tr("experimentBuilderPage.buildACompleteIndependentlyReconstructibleFabricationPlanFromVersioned")} meta={draft.source_baseline_name ? `${draft.source_baseline_name} · expanded baseline version ${draft.source_baseline_version_id}` : "Unsaved draft"} />
      {restoredDraft ? (
        <div className="draft-restored-note" role="status">
          <span>{tr("baselineAuthoring.draftRestoredFromYourLastEditingSessionYourEntered")}</span>
          <button type="button" className="button button--secondary button--small" onClick={discardRestoredDraft}>{tr("baselineAuthoring.discardDraft")}</button>
        </div>
      ) : null}
      <div className="builder-step-rail" aria-label={tr("experimentBuilderPage.experimentPlanningSteps")}>
        {STEPS.map((item) => <button key={item.id} type="button" className={step === item.id ? "builder-step builder-step--active" : "builder-step"} aria-current={step === item.id ? "step" : undefined} onClick={() => setStep(item.id)}><span className="builder-step__number">{item.number}</span><span className="builder-step__label">{localizeAppText(item.label ?? "")}</span></button>)}
      </div>
      <InlineFormError message={pageError} />
      <div className="builder-workspace">
        <div className="builder-workspace__editor">
          {step === "starting" ? <StartingPointPanel role={user.role} user={user} draft={draft} campaigns={catalogs.campaigns} baselines={catalogs.baselines} selectedBaselineId={selectedBaselineId} onCampaignChange={(campaign_id) => setDraft({ ...draft, campaign_id })} onBaselineChange={selectBaseline} onStartBlank={startBlank} /> : null}
          {step === "substrate" ? <SubstratePanel draft={draft} materials={catalogs.materials} layouts={catalogs.layouts} onChange={setDraft} onLayoutChange={(layout) => { try { setDraft(applyDeviceLayout(draft, layout)); setPageError(null); } catch (error) { setPageError(error instanceof Error ? error.message : "Unable to apply the layout."); } }} /> : null}
          {step === "layers" ? <LayerStackEditor draft={draft} presets={catalogs.presets} materials={catalogs.materials} vcdValves={vcdValves} onChange={setDraft} onError={setPageError} /> : null}
          {step === "conditions" ? <ConditionPlanner draft={draft} layouts={catalogs.layouts} vcdValves={vcdValves} onChange={setDraft} onError={setPageError} /> : null}
          {step === "review" ? <ReviewPanel draft={draft} campaigns={catalogs.campaigns} baselines={catalogs.baselines} layouts={catalogs.layouts} issues={issues} /> : null}
        </div>
        <aside className="builder-workspace__stack" aria-label={tr("experimentBuilderPage.currentDeviceStack")}>
          <div className="builder-stack-heading"><span>{tr("experimentBuilderPage.currentStack")}</span><strong>{draft.layers.length} {tr("layerStackEditor.layers")}</strong></div>
          <DeviceStackRail substrate={draft.substrate.material || "Substrate"} layers={draft.layers.map((layer) => ({ name: layer.name, role: layer.role, layerType: layer.layer_type }))} />
        </aside>
      </div>
      <div className="builder-actions">
        <span>{step !== "review" ? tr("experimentBuilderPage.completeEachStepThenReviewThePlanBeforeSaving") : issues.length === 0 ? tr("experimentBuilderPage.allRequiredPlanningValuesAreComplete") : tr("experimentBuilderPage.nReviewItemsRemain", { "n": issues.length })}</span>
        <div className="button-row">
          {step !== "review" ? <button type="button" className="button button--secondary" onClick={() => setStep("review")}>{tr("experimentBuilderPage.review")}</button> : null}
          <button type="button" className="button button--primary" disabled={submitting || issues.length > 0} onClick={() => void saveExperiment()}>{submitting ? tr("runSheetTable.saving") : tr("experimentBuilderPage.saveExperiment")}</button>
        </div>
      </div>
      <ConfirmDialog
        open={pendingStartChange !== null}
        title={tr("experimentBuilderPage.replaceCurrentDraft")}
        message={tr("experimentBuilderPage.selectingADifferentStartingPointReplacesTheDraftYou")}
        confirmLabel={tr("experimentBuilderPage.discardEditsAndReplace")}
        destructive
        onConfirm={() => {
          const pending = pendingStartChange;
          setPendingStartChange(null);
          if (!pending) return;
          if (pending.kind === "blank") applyStartBlank();
          else applyBaselineSelection(pending.id);
        }}
        onCancel={() => setPendingStartChange(null)}
      />
    </>
  );
}
