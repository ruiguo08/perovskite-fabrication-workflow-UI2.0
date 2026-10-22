import { useMemo } from "react";
import { translate as tr, useLanguage as useUiLanguage } from "../../i18n";
import { useEffect, useRef, useState } from "react";
import { JsonObjectField } from "../../components/JsonObjectField";

/**
 * Structured editor for free-form material specifications.
 *
 * Editing model — one applied object, two explicit modes:
 * - Row mode: scalar values (text, numbers, on/off) as typed key/value rows.
 *   Every accepted row edit immediately updates the applied object.
 * - Advanced mode: a draft JSON text of the complete object. The draft only
 *   reaches the applied object through an explicit Apply (or by closing the
 *   editor with a valid draft); Discard drops it. While the advanced editor
 *   is open the rows are disabled, so the two modes can never overwrite each
 *   other and a stale draft can never resurrect old data.
 *
 * Arrays and nested objects are never flattened: they stay in the applied
 * object untouched, are excluded from the rows, and are edited through the
 * advanced mode. Duplicate keys are validated across the whole object
 * namespace (rows and kept complex values). Empty number values are an error
 * — they never become 0; removing a field is an explicit Remove.
 */

type ScalarType = "text" | "number" | "boolean";

interface ScalarRow {
  /** Stable row identity: the key the row was created from. */
  id: string;
  key: string;
  type: ScalarType;
  /** Text form for text/number rows; boolean rows use the select. */
  text: string;
  booleanValue: boolean;
  /** Original value kept verbatim while it has not been edited. */
  original: unknown;
  error: string | null;
}

function isScalar(value: unknown): value is string | number | boolean | null {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function scalarTypeOfValue(value: unknown): ScalarType {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "text";
}

function rowsFromSpecification(specification: Record<string, unknown>): ScalarRow[] {
  return Object.entries(specification)
    .filter(([, value]) => isScalar(value))
    .map(([key, value]) => ({
      id: key,
      key,
      type: scalarTypeOfValue(value),
      text: typeof value === "number" ? String(value) : typeof value === "string" ? value : "",
      booleanValue: value === true,
      original: value,
      error: null,
    }));
}

function complexKeysOf(specification: Record<string, unknown>): string[] {
  return Object.entries(specification)
    .filter(([, value]) => !isScalar(value))
    .map(([key]) => key);
}

function buildSpecification(
  rows: ScalarRow[],
  specification: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const row of rows) {
    const key = row.key.trim();
    // Validation guarantees non-empty, unique keys and valid numbers here.
    if (!key) continue;
    if (row.type === "boolean") {
      next[key] = row.booleanValue;
      continue;
    }
    if (row.type === "number") {
      // Unedited number rows keep their original value verbatim.
      next[key] = row.text === String(row.original) && typeof row.original === "number"
        ? row.original
        : Number(row.text);
      continue;
    }
    // Text rows keep a not-yet-edited null verbatim.
    next[key] = row.original === null && row.text === "" ? null : row.text;
  }
  // Complex (array/object) entries are never shown as rows; keep them as-is.
  // Row validation guarantees no scalar row claims one of these keys.
  for (const [key, value] of Object.entries(specification)) {
    if (!isScalar(value)) {
      next[key] = value;
    }
  }
  return next;
}

function validateRows(rows: ScalarRow[], keptComplexKeys: string[]): ScalarRow[] {
  const keyCounts = new Map<string, number>();
  for (const row of rows) {
    const key = row.key.trim();
    if (key) {
      keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    }
  }
  const complexSet = new Set(keptComplexKeys);
  return rows.map((row) => {
    const key = row.key.trim();
    const hasContent = row.text.trim() !== "" || row.type === "boolean" || row.original !== "";
    if (!key) {
      return hasContent
        ? { ...row, error: "Enter a key for this value, or remove the row." }
        : { ...row, error: null };
    }
    if ((keyCounts.get(key) ?? 0) > 1) {
      return { ...row, error: "This key is used more than once." };
    }
    if (complexSet.has(key)) {
      return { ...row, error: "This key is already used by a kept array or object value." };
    }
    if (row.type === "number") {
      // An empty number field is an error, never a silent 0.
      if (row.text.trim() === "") {
        return { ...row, error: "Enter a number, or remove the row." };
      }
      if (!Number.isFinite(Number(row.text))) {
        return { ...row, error: "Enter a number." };
      }
    }
    return { ...row, error: null };
  });
}

function parseAdvancedDraft(text: string): { parsed: Record<string, unknown> | null; error: string | null } {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
      return { parsed: null, error: "Specification must be a JSON object." };
    }
    return { parsed: parsed as Record<string, unknown>, error: null };
  } catch {
    return { parsed: null, error: "Specification must be valid JSON." };
  }
}

export function SpecificationEditor({
  idPrefix,
  specification,
  onChange,
  onValidityChange,
}: {
  idPrefix: string;
  specification: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  onValidityChange?: (valid: boolean) => void;
}) {
  useUiLanguage();
  const [rows, setRows] = useState<ScalarRow[]>(() => validateRows(rowsFromSpecification(specification), complexKeysOf(specification)));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Draft text of the advanced editor; null means "no draft — mirror the
  // applied object". The draft never reaches the applied object on its own.
  const [advancedDraft, setAdvancedDraft] = useState<string | null>(null);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  // Remount counter for the advanced JsonObjectField: bumped whenever the
  // draft state is reset (Discard, external write) so the field's internal
  // error/aria-invalid state is rebuilt from the current value.
  const [advancedResetCount, setAdvancedResetCount] = useState(0);
  const advancedParsedRef = useRef<Record<string, unknown> | null>(null);
  // The last object this editor emitted; the external-write effect skips our
  // own writes so in-progress rows survive.
  const lastEmitted = useRef<Record<string, unknown> | null>(null);

  const keptComplexKeys = useMemo(() => complexKeysOf(specification), [specification]);
  const rowsValid = rows.every((row) => row.error === null);
  // A pending advanced edit (typed text that differs from the applied object)
  // blocks the surrounding save until it is applied or discarded.
  const advancedPending = advancedOpen
    && advancedDraft !== null
    && advancedDraft !== JSON.stringify(specification, null, 2);

  // External writes (parent reset, prefill) rebuild the rows and close any
  // draft state. Our own writes are recognized and skipped.
  useEffect(() => {
    if (specification === lastEmitted.current) {
      return;
    }
    setRows(validateRows(rowsFromSpecification(specification), complexKeysOf(specification)));
    setAdvancedDraft(null);
    setAdvancedError(null);
    advancedParsedRef.current = null;
    setAdvancedResetCount((count) => count + 1);
  }, [specification]);

  // Single validity contract: row errors, the advanced draft error, and a
  // pending (not yet applied) draft jointly decide whether the surrounding
  // form may save.
  useEffect(() => {
    onValidityChange?.(rowsValid && advancedError === null && !advancedPending);
  });

  function emit(nextRows: ScalarRow[]) {
    const validated = validateRows(nextRows, keptComplexKeys);
    setRows(validated);
    const valid = validated.every((row) => row.error === null);
    if (valid) {
      const built = buildSpecification(validated, specification);
      lastEmitted.current = built;
      onChange(built);
    }
    // Validity is reported by the effect above (rows state is the source).
  }

  function updateRow(id: string, patch: Partial<ScalarRow>) {
    emit(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    emit(rows.filter((row) => row.id !== id));
  }

  function addRow() {
    let suffix = 1;
    while (rows.some((row) => row.id === `new-field-${suffix}`)) {
      suffix += 1;
    }
    emit([...rows, {
      id: `new-field-${suffix}`,
      key: "",
      type: "text",
      text: "",
      booleanValue: false,
      original: "",
      error: null,
    }]);
  }

  function applyAdvanced(parsed: Record<string, unknown>) {
    lastEmitted.current = parsed;
    advancedParsedRef.current = null;
    onChange(parsed);
    setRows(validateRows(rowsFromSpecification(parsed), complexKeysOf(parsed)));
    setAdvancedDraft(null);
    setAdvancedError(null);
  }

  function discardAdvanced() {
    setAdvancedDraft(null);
    setAdvancedError(null);
    advancedParsedRef.current = null;
    // Remount the JSON field so its internal error/aria-invalid state is
    // rebuilt from the applied object.
    setAdvancedResetCount((count) => count + 1);
  }

  function toggleAdvanced() {
    if (advancedOpen) {
      if (advancedDraft === null || advancedDraft === JSON.stringify(specification, null, 2)) {
        // Nothing pending — close freely.
        setAdvancedOpen(false);
        setAdvancedError(null);
        advancedParsedRef.current = null;
        return;
      }
      const parsed = parseAdvancedDraft(advancedDraft);
      if (parsed.error === null && parsed.parsed !== null) {
        // Closing with a valid draft applies it explicitly.
        applyAdvanced(parsed.parsed);
        setAdvancedOpen(false);
        return;
      }
      // An invalid draft blocks closing so it is never dropped silently.
      setAdvancedError(parsed.error ?? "Specification must be a JSON object.");
      return;
    }
    setAdvancedOpen(true);
  }

  const advancedText = advancedDraft ?? JSON.stringify(specification, null, 2);

  function handleAdvancedTextChange(text: string) {
    setAdvancedDraft(text);
    const parsed = parseAdvancedDraft(text);
    advancedParsedRef.current = parsed.parsed;
    setAdvancedError(parsed.error);
  }

  return (
    <div>
      {advancedOpen ? (
        <p className="lib-muted" role="note">
          {tr("specificationEditor.advancedEditingIsActiveTheKeyValueRowsBelow")}</p>
      ) : null}
      {rows.length > 0 ? (
        <div className="lib-spec-rows">
          {rows.map((row) => (
            <div key={row.id} className={`lib-spec-row${row.error ? " lib-spec-row--error" : ""}`}>
              <input
                className="text-input"
                aria-label={tr("specificationEditor.specificationKeyKey", { "key": row.id })}
                placeholder={tr("specificationEditor.key")}
                value={row.key}
                disabled={advancedOpen}
                onChange={(event) => updateRow(row.id, { key: event.target.value })}
              />
              <select
                className="text-input"
                aria-label={tr("specificationEditor.valueTypeForKey", { "key": row.key || row.id })}
                value={row.type}
                disabled={advancedOpen}
                onChange={(event) => updateRow(row.id, { type: event.target.value as ScalarType })}
              >
                <option value="text">{tr("specificationEditor.text")}</option>
                <option value="number">{tr("specificationEditor.number")}</option>
                <option value="boolean">{tr("specificationEditor.onOff")}</option>
              </select>
              {row.type === "boolean" ? (
                <select
                  className="text-input lib-spec-row__value"
                  aria-label={tr("specificationEditor.valueForKey", { "key": row.key || row.id })}
                  value={row.booleanValue ? "true" : "false"}
                  disabled={advancedOpen}
                  onChange={(event) => updateRow(row.id, { booleanValue: event.target.value === "true" })}
                >
                  <option value="true">{tr("specificationEditor.on")}</option>
                  <option value="false">{tr("specificationEditor.off")}</option>
                </select>
              ) : (
                <input
                  className="text-input lib-spec-row__value"
                  aria-label={tr("specificationEditor.valueForKey", { "key": row.key || row.id })}
                  inputMode={row.type === "number" ? "decimal" : undefined}
                  placeholder={row.type === "number" ? "123" : "Value"}
                  value={row.text}
                  disabled={advancedOpen}
                  onChange={(event) => updateRow(row.id, { text: event.target.value })}
                />
              )}
              <button
                type="button"
                className="button button--secondary button--small"
                aria-label={tr("specificationEditor.removeSpecificationRowKey", { "key": row.key || row.id })}
                disabled={advancedOpen}
                onClick={() => removeRow(row.id)}
              >
                {tr("snapshotEditor.remove")}</button>
              {row.error ? <p className="form-field__error" role="alert">{row.error}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="builder-help">{tr("specificationEditor.noStructuredSpecificationValuesYetAddAKeyValue")}</p>
      )}
      {keptComplexKeys.length > 0 ? (
        <p className="lib-muted">
          {tr("specificationEditor.keptWithoutChangesEditInTheAdvancedEditor")}{keptComplexKeys.join(", ")}.
        </p>
      ) : null}
      <button
        type="button"
        className="button button--secondary button--small"
        disabled={advancedOpen}
        onClick={addRow}
      >
        {tr("specificationEditor.addSpecificationRow")}</button>

      <div className="lib-spec-advanced">
        <button
          type="button"
          className="button button--link"
          aria-expanded={advancedOpen}
          onClick={toggleAdvanced}
        >
          {advancedOpen ? tr("specificationEditor.hideAdvancedSpecificationEditor") : tr("specificationEditor.advancedSpecificationEditorJSON")}
        </button>
        {advancedOpen ? (
          <div>
            {advancedPending ? (
              <p className="lib-card-note" role="note">
                {tr("specificationEditor.applyOrDiscardTheJSONDraftBeforeSavingThe")}</p>
            ) : null}
            <JsonObjectField
              key={`${idPrefix}-advanced-${advancedResetCount}`}
              id={`${idPrefix}-advanced`}
              label={tr("specificationEditor.advancedSpecificationJSON")}
              hint={tr("specificationEditor.editsTheCompleteSpecificationIncludingListsAndNestedObjects")}
              value={advancedText}
              onTextChange={handleAdvancedTextChange}
              onValidChange={() => undefined}
            />
            {/* JSON errors render inside JsonObjectField; advancedError only
                gates validity and the close attempt. */}
            <div className="lib-actions">
              <button
                type="button"
                className="button button--secondary button--small"
                disabled={advancedError !== null || advancedParsedRef.current === null}
                onClick={() => {
                  if (advancedParsedRef.current !== null) {
                    applyAdvanced(advancedParsedRef.current);
                  }
                }}
              >
                {tr("specificationEditor.applyJSONDraft")}</button>
              {advancedDraft !== null ? (
                <button type="button" className="button button--secondary button--small" onClick={discardAdvanced}>
                  {tr("baselineAuthoring.discardDraft")}</button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
