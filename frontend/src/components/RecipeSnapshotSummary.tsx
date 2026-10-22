import { enumLabel } from "../i18n";
import { translate as tr, useLanguage as useUiLanguage } from "../i18n";
import type { ConditionDeviceConfiguration, PerovskiteDepositionProcess } from "../types/api";
import { DeviceStackRail } from "./DeviceStackRail";

interface RecipeSnapshotSummaryProps {
  // The condition-owned device configuration (also satisfied by a full
  // DeviceRecipe, e.g. a baseline revision).
  deviceRecipe: ConditionDeviceConfiguration;
  depositionProcess: PerovskiteDepositionProcess | null;
}

export function RecipeSnapshotSummary({
  deviceRecipe,
  depositionProcess,
}: RecipeSnapshotSummaryProps) {
  useUiLanguage();
  const substrate = deviceRecipe.substrate;
  return (
    <div className="recipe-summary">
      <DeviceStackRail
        substrate={`${substrate.material} · ${substrate.vendor} · ${substrate.type_number}`}
        layers={deviceRecipe.layers.map((layer) => ({
          name: layer.name,
          role: layer.role,
          layerType: layer.layer_type,
        }))}
      />
      <dl className="recipe-summary__metadata">
        <div><dt>{tr("recipeSnapshotSummary.junction")}</dt><dd>{enumLabel(deviceRecipe.junction_type)}</dd></div>
        <div><dt>{tr("recipeSnapshotSummary.bandgap")}</dt><dd>{enumLabel(deviceRecipe.perovskite_bandgap) ?? tr("recipeSnapshotSummary.notRecorded")}</dd></div>
        <div><dt>{tr("recipeSnapshotSummary.recipeSchema")}</dt><dd>{deviceRecipe.schema_version}</dd></div>
        <div><dt>{tr("recipeSnapshotSummary.perovskiteProcess")}</dt><dd>{enumLabel(depositionProcess?.method) ?? tr("recipeSnapshotSummary.notRecorded")}</dd></div>
      </dl>
    </div>
  );
}
