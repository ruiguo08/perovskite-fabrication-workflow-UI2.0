import { localizeAppText } from "../../i18n";
import { translate as tr, useLanguage as useUiLanguage, useLocalizedMemo } from "../../i18n";
import { useState, type FormEvent } from "react";
import { InlineFormError } from "../../components/InlineFormError";
import type { BatchRunSheet } from "../../types/api";
import { parseJsonField } from "./helpers";

interface DeviationSectionProps {
  sheet: BatchRunSheet;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  disabled: boolean;
}

export function DeviationSection({ sheet, onSubmit, disabled }: DeviationSectionProps) {
  useUiLanguage();
  const [category, setCategory] = useState("process");
  const [severity, setSeverity] = useState("warning");
  const [deviationType, setDeviationType] = useState("general");
  const [target, setTarget] = useState("");
  const [description, setDescription] = useState("");
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targets = useLocalizedMemo(() => {
    const options = [{ value: "", label: tr("deviationSection.wholeBatch") }];
    for (const { preparation } of sheet.preparations) {
      options.push({ value: `solution_preparation_id:${preparation.id}`, label: tr("deviationSection.preparationCode", { "code": preparation.preparation_code }) });
    }
    for (const { execution } of sheet.executions) {
      options.push({ value: `process_execution_id:${execution.id}`, label: tr("deviationSection.executionCode", { "code": execution.execution_code }) });
    }
    for (const substrate of sheet.substrates) {
      options.push({ value: `substrate_id:${substrate.id}`, label: tr("deviationSection.substrateCode", { "code": substrate.substrate_code }) });
    }
    for (const device of sheet.devices) {
      options.push({ value: `device_id:${device.id}`, label: tr("deviationSection.deviceCode", { "code": device.device_code }) });
    }
    for (const condition of sheet.conditions) {
      options.push({ value: `condition_id:${condition.id}`, label: tr("deviationSection.conditionCode", { "code": condition.condition_code }) });
    }
    return options;
  }, [sheet]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        category,
        severity,
        deviation_type: deviationType,
        description: description.trim(),
      };
      if (target) {
        const [field, id] = target.split(":", 2);
        payload[field] = Number(id);
      }
      payload.planned_value = parseJsonField("Planned value", planned);
      payload.actual_value = parseJsonField("Actual value", actual);
      await onSubmit(payload);
      setCategory("process");
      setSeverity("warning");
      setDeviationType("general");
      setTarget("");
      setDescription("");
      setPlanned("");
      setActual("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to record the deviation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="run-sheet-form deviation-form" onSubmit={(event) => void submit(event)}>
      <label className="form-field">
        <span className="form-field__label">{tr("runSheetTable.category")}</span>
        <select className="text-input" data-deviation-category="true" value={category} onChange={(event) => setCategory(event.target.value)}>
          {["process", "material", "equipment", "substrate", "device", "operator", "other"].map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span className="form-field__label">{tr("runSheetTable.severity")}</span>
        <select className="text-input" data-deviation-severity="true" value={severity} onChange={(event) => setSeverity(event.target.value)}>
          {["info", "warning", "error", "critical"].map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span className="form-field__label">{tr("deviationSection.type")}</span>
        <select className="text-input" data-deviation-type-select="true" value={deviationType} onChange={(event) => setDeviationType(event.target.value)}>
          <option value="general">{tr("deviationSection.general")}</option>
          <option value="fabrication_shortfall">{tr("deviationSection.fabricationShortfall")}</option>
          <option value="measurement_shortfall">{tr("deviationSection.measurementShortfall")}</option>
        </select>
      </label>
      <label className="form-field">
        <span className="form-field__label">{tr("campaignAnalysisPanel.target")}</span>
        <select className="text-input" data-deviation-target="true" value={target} onChange={(event) => setTarget(event.target.value)}>
          {targets.map((option) => (
            <option key={option.value} value={option.value}>{localizeAppText(option.label ?? "")}</option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span className="form-field__label">{tr("deviationSection.description")}</span>
        <textarea className="text-input" data-deviation-description="true" required maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label className="form-field">
        <span className="form-field__label">{tr("deviationSection.plannedValueJSON")}</span>
        <textarea className="text-input" data-deviation-planned="true" value={planned} onChange={(event) => setPlanned(event.target.value)} />
      </label>
      <label className="form-field">
        <span className="form-field__label">{tr("deviationSection.actualValueJSON")}</span>
        <textarea className="text-input" data-deviation-actual="true" value={actual} onChange={(event) => setActual(event.target.value)} />
      </label>
      <button className="button button--primary" type="submit" data-deviation-submit="true" disabled={submitting || disabled}>
        {tr("runSheetTable.recordDeviation")}</button>
      <InlineFormError message={localizeAppText(error ?? "")} />
    </form>
  );
}
