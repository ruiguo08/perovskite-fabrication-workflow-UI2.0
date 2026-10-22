import { useMemo } from "react";
import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import { useCallback, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useApiResource } from "../../lib/useApiResource";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { LayerProcessEditor, PerovskiteProcessEditor } from "./ProcessEditor";
import { SolutionEditor } from "./SolutionEditor";
import type { DeviceLayout, Material, PerovskiteDepositionProcess } from "../../types/api";
import {
  addTargetCondition,
  planTypeChangeImpact,
  removeTargetCondition,
  replaceCondition,
  setPlanType,
} from "./state";
import type { BuilderCondition, BuilderPlanType, ExperimentDraft } from "./types";

interface TargetSnapshotEditorProps {
  index: number;
  condition: BuilderCondition;
  materials: Material[];
  vcdValves?: readonly string[];
  onChange: (condition: BuilderCondition) => void;
}

function TargetSnapshotEditor({ index, condition, materials, vcdValves, onChange }: TargetSnapshotEditorProps) {
  useUiLanguage();
  function updateLayer(layerIndex: number, layer: BuilderCondition["layers"][number]) {
    onChange({ ...condition, layers: condition.layers.map((item, itemIndex) => itemIndex === layerIndex ? layer : item) });
  }
  return (
    <div className="builder-target-snapshot">
      <p className="builder-help">{tr("conditionPlanner.eachTargetRetainsACompleteEditableLayerStackAnd")}</p>
      {condition.layers.map((layer, layerIndex) => (
        <div className="builder-target-layer" key={`${layer.layer_type}-${layerIndex}`}>
          <div className="builder-subeditor__heading">
            <h4>{tr("conditionPlanner.layer")}{layerIndex + 1} · {layer.name}</h4>
            <code>{layer.layer_type}</code>
          </div>
          <label className="builder-field"><span>{tr("conditionPlanner.layerName")}</span>
            <input className="text-input" value={layer.name} onChange={(event) => updateLayer(layerIndex, { ...layer, name: event.target.value })} />
          </label>
          <SolutionEditor idPrefix={`target-${index}-layer-${layerIndex}`} solution={layer.solution} materials={materials} onChange={(solution) => updateLayer(layerIndex, { ...layer, solution })} />
          {layer.layer_type !== "perovskite" ? (
            <LayerProcessEditor layerType={layer.layer_type} process={layer.process ?? null} materials={materials} onChange={(process) => updateLayer(layerIndex, { ...layer, process })} />
          ) : null}
        </div>
      ))}
      <PerovskiteProcessEditor process={condition.deposition_process} materials={materials} vcdValves={vcdValves} onChange={(process: PerovskiteDepositionProcess) => onChange({ ...condition, deposition_process: process })} />
    </div>
  );
}

interface ConditionPlannerProps {
  draft: ExperimentDraft;
  layouts: DeviceLayout[];
  /** Authoritative valve choices from GET /api/editor-config. */
  vcdValves?: readonly string[];
  onChange: (draft: ExperimentDraft) => void;
  onError: (message: string | null) => void;
}

export function ConditionPlanner({ draft, layouts, vcdValves, onChange, onError }: ConditionPlannerProps) {
  useUiLanguage();
  const loadMaterials = useCallback(() => apiFetch<Material[]>("/api/materials"), []);
  const materialsResource = useApiResource(loadMaterials);
  const materials = materialsResource.data ?? [];
  const matchingLayouts = layouts.filter((layout) => Number(layout.substrate_width_mm) === draft.substrate.width_mm && Number(layout.substrate_length_mm) === draft.substrate.length_mm);
  const [pendingPlanType, setPendingPlanType] = useState<BuilderPlanType | null>(null);
  const pendingImpact = useMemo(
    () => (pendingPlanType === null ? null : planTypeChangeImpact(draft, pendingPlanType)),
    [draft, pendingPlanType],
  );

  function apply(action: () => ExperimentDraft) {
    try {
      onChange(action());
      onError(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to update the experiment conditions.");
    }
  }

  function requestPlanType(planType: BuilderPlanType) {
    const impact = planTypeChangeImpact(draft, planType);
    if (!impact.destructive) {
      apply(() => setPlanType(draft, planType));
      return;
    }
    setPendingPlanType(planType);
  }

  return (
    <section className="builder-panel" aria-labelledby="builder-conditions-title">
      <div className="builder-panel__heading">
        <div><span className="builder-panel__eyebrow">{tr("conditionPlanner.step")}</span><h2 id="builder-conditions-title">{tr("conditionPlanner.experimentConditions")}</h2></div>
        {draft.plan_type === "comparative" ? <button type="button" className="button button--secondary button--small" onClick={() => apply(() => addTargetCondition(draft))}>{tr("conditionPlanner.addTarget")}</button> : null}
      </div>
      <fieldset className="builder-plan-type">
        <legend>{tr("conditionPlanner.planType")}</legend>
        <label><input type="radio" name="plan-type" value="comparative" checked={draft.plan_type === "comparative"} onChange={() => requestPlanType("comparative")} /> {tr("conditionPlanner.comparative")}</label>
        <label><input type="radio" name="plan-type" value="standalone" checked={draft.plan_type === "standalone"} onChange={() => requestPlanType("standalone")} /> {tr("conditionPlanner.standalone")}</label>
      </fieldset>
      <p className="builder-help">{tr("conditionPlanner.targetConditionsBeginAsDeepCopiesEachTargetRetains")}</p>
      <div className="builder-condition-list">
        {draft.conditions.map((condition, index) => {
          const layout = layouts.find((item) => item.code === condition.device_layout_code);
          return (
            <article className={`builder-condition-card builder-condition-card--${condition.kind}`} key={condition.group_id}>
              <div className="builder-layer-card__header">
                <div><span className="builder-condition-card__role">{condition.kind}</span><h3>{condition.name}</h3><p><code>{condition.group_id}</code></p></div>
                {condition.kind === "target" && draft.conditions.filter((item) => item.kind === "target").length > 1 ? <button type="button" className="button button--secondary button--small" onClick={() => apply(() => removeTargetCondition(draft, index))}>{tr("conditionPlanner.removeTarget")}</button> : null}
              </div>
              <div className="builder-fields builder-fields--three">
                <label className="builder-field"><span>{tr("conditionPlanner.conditionName")}</span><input className="text-input" value={condition.name} onChange={(event) => onChange(replaceCondition(draft, index, { ...condition, name: event.target.value }))} /></label>
                <label className="builder-field"><span>{tr("conditionPlanner.deviceLayout")}</span><select className="text-input" value={condition.device_layout_code} onChange={(event) => onChange(replaceCondition(draft, index, { ...condition, device_layout_code: event.target.value }))}><option value="">{tr("conditionPlanner.chooseAMatchingLayout")}</option>{matchingLayouts.map((item) => <option key={item.code} value={item.code}>{item.description}</option>)}</select></label>
                <label className="builder-field"><span>{tr("conditionPlanner.plannedSubstrates")}</span><input className="text-input" type="number" min="1" step="1" value={condition.planned_substrate_count} onChange={(event) => onChange(replaceCondition(draft, index, { ...condition, planned_substrate_count: Number(event.target.value) }))} /></label>
              </div>
              <p className="builder-condition-card__count">{tr("conditionPlanner.expectedDevices")}<strong>{layout ? layout.devices_per_substrate * condition.planned_substrate_count : "—"}</strong></p>
              {condition.kind === "target" ? <details><summary>{tr("conditionPlanner.editCompleteIndependentTargetSnapshot")}</summary><TargetSnapshotEditor index={index} condition={condition} materials={materials} vcdValves={vcdValves} onChange={(replacement) => onChange(replaceCondition(draft, index, replacement))} /></details> : null}
            </article>
          );
        })}
      </div>
      {pendingPlanType !== null && pendingImpact !== null ? (
        <ConfirmDialog
          open
          title={tr("conditionPlanner.changePlanType")}
          message={
            `Switching to ${pendingPlanType} rebuilds the condition list and discards these condition-specific edits:\n` +
            pendingImpact.discardedSummaries.map((summary) => `• ${summary}`).join("\n")
          }
          confirmLabel={tr("conditionPlanner.discardEditsAndSwitch")}
          destructive
          onConfirm={() => {
            const planType = pendingPlanType;
            setPendingPlanType(null);
            apply(() => setPlanType(draft, planType));
          }}
          onCancel={() => setPendingPlanType(null)}
        />
      ) : null}
    </section>
  );
}
