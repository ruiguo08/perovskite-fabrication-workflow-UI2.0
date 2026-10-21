import { enumLabel, localizeAppText } from "../../i18n";
import { useMemo } from "react";
import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import { useRef, useState } from "react";
import type { DeviceLayer, LayerPreset, Material } from "../../types/api";
import { RequiredLegend } from "../../components/RequiredLegend";
import { VCD_VALVES } from "../../lib/constraints";
import { completeDepositionProcess, completeLayer } from "./validation";
import type { DraftIssue, ExperimentDraft } from "./types";
import {
  addBlankLayer,
  addLayer,
  canAddLayerType,
  canReorderLayers,
  expandLayerPreset,
  LAYER_TYPE_DEFS,
  moveLayerWithinRole,
  removeLayer,
  reorderLayer,
  replacePrimaryLayer,
  replacePrimaryProcess,
  setArchitecture,
} from "./state";
import { LayerProcessEditor, PerovskiteProcessEditor } from "./ProcessEditor";
import { SolutionEditor } from "./SolutionEditor";

interface LayerStackEditorProps {
  draft: ExperimentDraft;
  presets: LayerPreset[];
  materials: Material[];
  /** Authoritative valve choices from GET /api/editor-config. */
  vcdValves?: readonly string[];
  onChange: (draft: ExperimentDraft) => void;
  onError: (message: string | null) => void;
}

function layerLabel(layer: DeviceLayer): string {
  return `${layer.name} · ${enumLabel(layer.role)}`;
}

export function LayerStackEditor({ draft, presets, materials, vcdValves, onChange, onError }: LayerStackEditorProps) {
  useUiLanguage();
  const [presetId, setPresetId] = useState("");
  const [blankType, setBlankType] = useState("");
  const valves = vcdValves ?? VCD_VALVES;
  const activePresets = useMemo(
    () => presets.filter((preset) => preset.status === "active").sort((left, right) => left.name.localeCompare(right.name)),
    [presets],
  );
  // Surface incomplete values on the collapsed cards so students know which
  // card hides the review item: the perovskite card stores its process in
  // draft.deposition_process; other layers carry their own process/solution.
  const perovskiteIncomplete = useMemo(() => {
    const found: DraftIssue[] = [];
    completeDepositionProcess(draft.deposition_process, found, "deposition_process", "perovskite", valves);
    return found.length > 0;
  }, [draft.deposition_process, valves]);
  const incompleteLayers = useMemo(() => {
    const incomplete = new Set<number>();
    draft.layers.forEach((layer, index) => {
      const found: DraftIssue[] = [];
      completeLayer(layer, index, found);
      if (found.length > 0) {
        incomplete.add(index);
      }
    });
    return incomplete;
  }, [draft.layers]);

  function apply(action: () => ExperimentDraft) {
    try {
      onChange(action());
      onError(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to update the layer stack.");
    }
  }

  // Drag-and-drop reordering. Only same role + layer_type runs are reorderable
  // (enforced by canReorderLayers/reorderLayer); the handle is rendered only on
  // cards where a legal move exists, and illegal drop targets reject the drop
  // (no preventDefault → the browser shows its not-allowed cursor) instead of
  // silently doing nothing.
  const draggedIndex = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; edge: "before" | "after" } | null>(null);

  function handleDragStart(index: number, event: { dataTransfer: DataTransfer | null; currentTarget: Element }) {
    draggedIndex.current = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      // Firefox only starts a drag once the data store is populated.
      event.dataTransfer.setData("text/plain", String(index));
      const card = event.currentTarget.closest(".builder-layer-card");
      if (card && typeof event.dataTransfer.setDragImage === "function") {
        // Drag the whole card, not the tiny handle glyph.
        event.dataTransfer.setDragImage(card, 24, 12);
      }
    }
  }

  function handleDragOver(index: number, event: { preventDefault: () => void; dataTransfer: DataTransfer | null }) {
    const from = draggedIndex.current;
    if (from === null || from === index || !canReorderLayers(draft, from, index)) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
      }
      setDropTarget((current) => (current === null ? current : null));
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    const edge: "before" | "after" = index > from ? "after" : "before";
    setDropTarget((current) => (current && current.index === index && current.edge === edge ? current : { index, edge }));
  }

  function handleDrop(index: number, event: { preventDefault: () => void }) {
    event.preventDefault();
    const from = draggedIndex.current;
    draggedIndex.current = null;
    setDropTarget(null);
    if (from === null || !canReorderLayers(draft, from, index)) {
      return;
    }
    apply(() => reorderLayer(draft, from, index));
  }

  function handleDragEnd() {
    draggedIndex.current = null;
    setDropTarget(null);
  }

  function addSelectedPreset() {
    const preset = activePresets.find((item) => String(item.id) === presetId);
    if (!preset) return;
    apply(() => addLayer(draft, preset));
    setPresetId("");
  }

  function addSelectedBlankLayer() {
    if (!blankType) return;
    apply(() => addBlankLayer(draft, blankType));
    setBlankType("");
  }

  return (
    <section className="builder-panel" aria-labelledby="builder-layers-title">
      <div className="builder-panel__heading">
        <div><span className="builder-panel__eyebrow">{tr("layerStackEditor.step")}</span><h2 id="builder-layers-title">{tr("layerStackEditor.functionalLayerStack")}</h2></div>
        <span className="record-count">{draft.layers.length} {tr("layerStackEditor.layers")}</span>
      </div>
      <p className="builder-help">{tr("layerStackEditor.addingOrReplacingAPresetCopiesItsCompleteValues")}</p>
      <RequiredLegend />
      <div className="builder-architecture-picker">
        <label className="builder-field" htmlFor="builder-architecture"><span>{tr("layerStackEditor.deviceArchitecture")}</span>
          <select id="builder-architecture" className="text-input" value={draft.architecture} onChange={(event) => onChange(setArchitecture(draft, event.target.value as "pin" | "nip"))}>
            <option value="pin">{tr("layerStackEditor.pINInvertedHTLOnSubstrate")}</option>
            <option value="nip">{tr("layerStackEditor.nIPRegularETLOnSubstrate")}</option>
          </select>
        </label>
        <p className="builder-help">{tr("layerStackEditor.setsTheDepositionRoleOrderSwitchingReSortsThe")}</p>
      </div>
      <div className="builder-preset-picker">
        <label className="builder-field" htmlFor="builder-add-preset"><span>{tr("layerStackEditor.layerPreset")}</span>
          <select id="builder-add-preset" className="text-input" value={presetId} onChange={(event) => setPresetId(event.target.value)}>
            <option value="">{tr("layerStackEditor.chooseAnActivePreset")}</option>
            {activePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} · {preset.layer.layer_type} · {preset.scope}</option>)}
          </select>
        </label>
        <button type="button" className="button button--secondary" disabled={!presetId} onClick={addSelectedPreset}>{tr("layerStackEditor.addCopiedPreset")}</button>
      </div>
      <div className="builder-preset-picker">
        <label className="builder-field" htmlFor="builder-add-blank"><span>{tr("layerStackEditor.newBlankLayer")}</span>
          <select id="builder-add-blank" className="text-input" value={blankType} onChange={(event) => setBlankType(event.target.value)}>
            <option value="">{tr("layerStackEditor.chooseALayerType")}</option>
            {LAYER_TYPE_DEFS.filter((definition) => canAddLayerType(draft, definition.layerType)).map((definition) => (
              <option key={definition.layerType} value={definition.layerType}>{localizeAppText(definition.label ?? "")} · {enumLabel(definition.role)}</option>
            ))}
          </select>
        </label>
        <button type="button" className="button button--secondary" disabled={!blankType} onClick={addSelectedBlankLayer}>{tr("layerStackEditor.addBlankLayer")}</button>
      </div>
      <p className="builder-help">{tr("layerStackEditor.aBlankLayerStartsWithNoSolutionAndNo")}</p>
      <p className="builder-help">{tr("layerStackEditor.layersOfTheSameMaterialTypeCanBeResequenced")}</p>

      <div className="builder-layer-list">
        {draft.layers.length === 0 ? <p className="builder-empty-editor">{tr("layerStackEditor.noLayersYetAddCopiedPresetsOrBlankLayers")}</p> : null}
        {draft.layers.map((layer, index) => {
          const replacementPresets = activePresets.filter((preset) => preset.layer.layer_type === layer.layer_type);
          const canMoveEarlier = index > 0 && draft.layers[index - 1].role === layer.role && draft.layers[index - 1].layer_type === layer.layer_type;
          const canMoveLater = index < draft.layers.length - 1 && draft.layers[index + 1].role === layer.role && draft.layers[index + 1].layer_type === layer.layer_type;
          const reorderable = canMoveEarlier || canMoveLater;
          const dropClass = dropTarget?.index === index ? ` builder-layer-card--drop-${dropTarget.edge}` : "";
          return (
            <article className={`builder-layer-card${dropClass}`} key={`${layer.layer_type}-${index}`} aria-label={layerLabel(layer)} onDragOver={(event) => handleDragOver(index, event)} onDrop={(event) => handleDrop(index, event)}>
              <div className="builder-layer-card__header">
                <div>
                  {reorderable ? (
                    <span
                      className="builder-layer-card__drag"
                      draggable
                      onDragStart={(event) => handleDragStart(index, event)}
                      onDragEnd={handleDragEnd}
                      title={tr("layerStackEditor.dragToReorder")}
                      aria-hidden="true"
                    >
                      ⠿
                    </span>
                  ) : (
                    <span className="builder-layer-card__drag builder-layer-card__drag--placeholder" aria-hidden="true">⠿</span>
                  )}
                  <span className="builder-layer-card__index">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{layer.name}</h3>
                  <p>{enumLabel(layer.role)} · <code>{layer.layer_type}</code>{layer.preset_id ? tr("layerStackEditor.copiedFromSource", { "source": layer.preset_id }) : ""}</p>
                  {layer.layer_type === "perovskite" && perovskiteIncomplete ? (
                    <p className="builder-layer-card__warning">{tr("layerStackEditor.perovskiteProcessIncompleteOpenEditCompleteLayerValuesAnd")}</p>
                  ) : layer.layer_type !== "perovskite" && incompleteLayers.has(index) ? (
                    <p className="builder-layer-card__warning">{tr("layerStackEditor.layerValuesIncompleteOpenEditCompleteLayerValuesAnd")}</p>
                  ) : null}
                </div>
                <div className="button-row">
                  <button type="button" className="button button--secondary button--small" disabled={!canMoveEarlier} aria-label={tr("snapshotEditor.moveNameUp", { "name": layer.name })} onClick={() => apply(() => moveLayerWithinRole(draft, index, -1))}>↑</button>
                  <button type="button" className="button button--secondary button--small" disabled={!canMoveLater} aria-label={tr("snapshotEditor.moveNameDown", { "name": layer.name })} onClick={() => apply(() => moveLayerWithinRole(draft, index, 1))}>↓</button>
                  <button type="button" className="button button--secondary button--small" onClick={() => apply(() => removeLayer(draft, index))}>{tr("snapshotEditor.remove")}</button>
                </div>
              </div>
              <details className="builder-layer-card__editor">
                <summary>{tr("layerStackEditor.editCompleteLayerValues")}</summary>
                <div className="builder-fields builder-fields--two">
                  <label className="builder-field"><span>{tr("conditionPlanner.layerName")}</span><input className="text-input" value={layer.name} onChange={(event) => onChange(replacePrimaryLayer(draft, index, { ...layer, name: event.target.value }))} /></label>
                  <label className="builder-field"><span>{tr("layerStackEditor.replaceFromSameTypePreset")}</span>
                    <select className="text-input" value="" onChange={(event) => { const preset = replacementPresets.find((item) => String(item.id) === event.target.value); if (preset) apply(() => expandLayerPreset(draft, index, preset)); }}>
                      <option value="">{tr("layerStackEditor.keepCurrentExpandedValues")}</option>
                      {replacementPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} {tr("layerStackEditor.revision")}{preset.current_revision_number}</option>)}
                    </select>
                  </label>
                </div>
                <SolutionEditor idPrefix={`layer-${index}`} solution={layer.solution} materials={materials} onChange={(solution) => onChange(replacePrimaryLayer(draft, index, { ...layer, solution }))} />
                {layer.layer_type === "perovskite" ? (
                  <PerovskiteProcessEditor process={draft.deposition_process} materials={materials} vcdValves={valves} onChange={(process) => onChange(replacePrimaryProcess(draft, process))} />
                ) : (
                  <LayerProcessEditor layerType={layer.layer_type} process={layer.process} materials={materials} onChange={(process) => onChange(replacePrimaryLayer(draft, index, { ...layer, process }))} />
                )}
              </details>
            </article>
          );
        })}
      </div>

    </section>
  );
}
