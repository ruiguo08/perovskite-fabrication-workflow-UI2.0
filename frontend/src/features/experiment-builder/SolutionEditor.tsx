import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import { NumberField } from "../../components/Field";
import type { LayerSolution, Material } from "../../types/api";

interface SolutionEditorProps {
  idPrefix: string;
  solution: LayerSolution | null;
  materials: Material[];
  onChange: (solution: LayerSolution | null) => void;
}

// The materials list is already scoped by /api/materials: pending entries
// shown to a student are always their own proposals, so they are selectable
// here exactly like the substrate panel treats them.
function materialNames(materials: Material[], category: string): string[] {
  return materials
    .filter((material) => (material.status === "active" || material.status === "pending") && material.category === category)
    .map((material) => material.name)
    .sort((left, right) => left.localeCompare(right));
}

export function SolutionEditor({ idPrefix, solution, materials, onChange }: SolutionEditorProps) {
  useUiLanguage();
  const chemicalNames = materialNames(materials, "chemical");
  const solventNames = materialNames(materials, "solvent");

  if (solution === null) {
    return (
      <div className="builder-empty-editor">
        <p>{tr("solutionEditor.noSolutionFormulationIsRecordedForThisLayer")}</p>
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={() => onChange({
            formulation_type: "weighed_solids",
            stock_dispersion: "",
            stock_volume_ml: null,
            solids: [],
            solvents: [],
          })}
        >
          {tr("solutionEditor.addSolutionFormulation")}</button>
      </div>
    );
  }

  return (
    <div className="builder-subeditor">
      <div className="builder-subeditor__heading">
        <h4>{tr("solutionEditor.solutionFormulation")}</h4>
        <button type="button" className="button button--secondary button--small" onClick={() => onChange(null)}>
          {tr("solutionEditor.removeFormulation")}</button>
      </div>
      <label className="builder-field">
        <span>{tr("solutionEditor.formulationType")}</span>
        <select
          className="text-input"
          value={solution.formulation_type}
          onChange={(event) => onChange({ ...solution, formulation_type: event.target.value as LayerSolution["formulation_type"] })}
        >
          <option value="weighed_solids">{tr("snapshotEditor.weighedSolids")}</option>
          <option value="diluted_dispersion">{tr("snapshotEditor.dilutedDispersion")}</option>
        </select>
      </label>

      {solution.formulation_type === "diluted_dispersion" ? (
        <div className="builder-fields builder-fields--two">
          <label className="builder-field">
            <span>{tr("solutionEditor.stockDispersion")}</span>
            <input
              className="text-input"
              list={`${idPrefix}-chemical-options`}
              value={solution.stock_dispersion}
              onChange={(event) => onChange({ ...solution, stock_dispersion: event.target.value })}
            />
          </label>
          <NumberField name="stock_volume_ml" label={tr("solutionEditor.stockVolumeML")} value={solution.stock_volume_ml} onChange={(stock_volume_ml) => onChange({ ...solution, stock_volume_ml })} />
        </div>
      ) : null}

      <datalist id={`${idPrefix}-chemical-options`}>
        {chemicalNames.map((name) => <option key={name} value={name} />)}
      </datalist>
      <datalist id={`${idPrefix}-solvent-options`}>
        {solventNames.map((name) => <option key={name} value={name} />)}
      </datalist>

      <div className="builder-stage-group">
        <div className="builder-subeditor__heading">
          <h4>{tr("solutionEditor.solidIngredients")}</h4>
          <button
            type="button"
            className="button button--secondary button--small"
            disabled={solution.solids.length >= 20}
            onClick={() => onChange({ ...solution, solids: [...solution.solids, { chemical: "", weight_mg: null }] })}
          >
            {tr("solutionEditor.addSolid")}</button>
        </div>
        {solution.solids.map((solid, index) => (
          <div className="builder-stage-row" key={`${idPrefix}-solid-${index}`}>
            <label className="builder-field">
              <span>{tr("solutionEditor.chemical")}{index + 1}</span>
              <input
                className="text-input"
                list={`${idPrefix}-chemical-options`}
                value={solid.chemical}
                onChange={(event) => onChange({
                  ...solution,
                  solids: solution.solids.map((item, itemIndex) => itemIndex === index ? { ...item, chemical: event.target.value } : item),
                })}
              />
            </label>
            <NumberField name="weight_mg" label={tr("solutionEditor.weightMg")} value={solid.weight_mg} onChange={(weight_mg) => onChange({
              ...solution,
              solids: solution.solids.map((item, itemIndex) => itemIndex === index ? { ...item, weight_mg } : item),
            })} />
            <button
              type="button"
              className="button button--secondary button--small builder-stage-row__remove"
              aria-label={tr("solutionEditor.removeSolidN", { "n": index + 1 })}
              onClick={() => onChange({ ...solution, solids: solution.solids.filter((_, itemIndex) => itemIndex !== index) })}
            >
              {tr("snapshotEditor.remove")}</button>
          </div>
        ))}
      </div>

      <div className="builder-stage-group">
        <div className="builder-subeditor__heading">
          <h4>{tr("solutionEditor.solvents")}</h4>
          <button
            type="button"
            className="button button--secondary button--small"
            disabled={solution.solvents.length >= 10}
            onClick={() => onChange({ ...solution, solvents: [...solution.solvents, { solvent: "", volume_ml: null }] })}
          >
            {tr("solutionEditor.addSolvent")}</button>
        </div>
        {solution.solvents.map((solvent, index) => (
          <div className="builder-stage-row" key={`${idPrefix}-solvent-${index}`}>
            <label className="builder-field">
              <span>{tr("solutionEditor.solvent")}{index + 1}</span>
              <input
                className="text-input"
                list={`${idPrefix}-solvent-options`}
                value={solvent.solvent}
                onChange={(event) => onChange({
                  ...solution,
                  solvents: solution.solvents.map((item, itemIndex) => itemIndex === index ? { ...item, solvent: event.target.value } : item),
                })}
              />
            </label>
            <NumberField name="volume_ml" label={tr("solutionEditor.volumeML")} value={solvent.volume_ml} onChange={(volume_ml) => onChange({
              ...solution,
              solvents: solution.solvents.map((item, itemIndex) => itemIndex === index ? { ...item, volume_ml } : item),
            })} />
            <button
              type="button"
              className="button button--secondary button--small builder-stage-row__remove"
              aria-label={tr("solutionEditor.removeSolventN", { "n": index + 1 })}
              onClick={() => onChange({ ...solution, solvents: solution.solvents.filter((_, itemIndex) => itemIndex !== index) })}
            >
              {tr("snapshotEditor.remove")}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
