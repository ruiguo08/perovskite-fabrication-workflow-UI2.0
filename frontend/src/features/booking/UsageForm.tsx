import { useState } from "react";
import { useLanguage } from "../../i18n";
import type { MessageKey } from "../../i18n/messages";
import type { Usage } from "./types";

export function UsageForm({
  usage,
  readOnly,
  busy,
  inUse,
  completed,
  onSave,
}: {
  usage: Usage;
  readOnly: boolean;
  busy: boolean;
  inUse: boolean;
  completed: boolean;
  onSave: (
    fields: Record<string, unknown>,
    notes: string,
    mode: "draft" | "submit" | "submit_and_end" | "end",
  ) => void;
}) {
  const { t } = useLanguage();
  const [values, setValues] = useState<Record<string, unknown>>(usage.fields);
  const [notes, setNotes] = useState(usage.notes);
  const [layers, setLayers] = useState<
    { material: string; thickness: string }[]
  >(() => {
    const stored = usage.fields.layers;
    return Array.isArray(stored)
      ? stored.map((layer: { material: string; thickness: number }) => ({
          material: layer.material,
          thickness: String(layer.thickness),
        }))
      : [{ material: "", thickness: "" }];
  });
  function input(key: string, label: MessageKey, unit = "", type = "number") {
    return (
      <label className="booking-field" key={key}>
        {t(label)}
        {unit ? ` (${unit})` : ""}
        <input
          className="text-input"
          type={type}
          step={key === "cycles" ? "1" : "any"}
          min={
            key === "cycles" ? 1 : key.includes("temperature") ? undefined : 0
          }
          required={false}
          disabled={readOnly || busy}
          value={String(values[key] ?? "")}
          onChange={(e) => setValues({ ...values, [key]: e.target.value })}
        />
      </label>
    );
  }
  function fields() {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      if (key === "layers" || value === "" || value === undefined) continue;
      result[key] =
        key === "material" || key === "usage" ? value : Number(value);
    }
    const filledLayers = layers.filter(
      (layer) => layer.material !== "" || layer.thickness !== "",
    );
    if (usage.template === "evaporation" && filledLayers.length)
      result.layers = filledLayers.map((layer) => ({
        material: layer.material,
        thickness: layer.thickness === "" ? null : Number(layer.thickness),
      }));
    return result;
  }
  return (
    <section className="booking-usage">
      <h3>
        {t("booking.usage")} · {t(`booking.${usage.status}`)}
      </h3>
      <p className="muted">
        {t("booking.snapshot", {
          template: t(`booking.${usage.template}`),
          version: usage.template_version,
        })}
      </p>
      <div className="booking-form-grid">
        {usage.template === "glovebox" &&
          (
            [
              "before_h2o",
              "after_h2o",
              "before_o2",
              "after_o2",
              "before_temperature",
              "after_temperature",
            ] as const
          ).map((key) =>
            input(
              key,
              `booking.${key}`,
              usage.units[
                key.includes("h2o")
                  ? "h2o"
                  : key.includes("o2")
                    ? "o2"
                    : "temperature"
              ],
            ),
          )}
        {usage.template === "ald" && (
          <>
            {input("material", "booking.material", "", "text")}
            {input("cycles", "booking.cycles", usage.units.cycles)}
            {input(
              "initial_temperature",
              "booking.initial_temperature",
              usage.units.temperature,
            )}
            {input(
              "chamber_pressure",
              "booking.chamber_pressure",
              usage.units.pressure,
            )}
          </>
        )}
        {usage.template === "evaporation" && (
          <>
            {input("vacuum", "booking.vacuumValue", usage.units.pressure)}
            {input(
              "initial_temperature",
              "booking.initial_temperature",
              usage.units.temperature,
            )}
          </>
        )}
        {usage.template === "general" && (
          <label className="booking-field booking-field--wide">
            {t("booking.usageText")}
            <textarea
              className="text-input"
              disabled={readOnly || busy}
              value={String(values.usage ?? "")}
              onChange={(e) => setValues({ ...values, usage: e.target.value })}
            />
          </label>
        )}
      </div>
      {usage.template === "evaporation" && (
        <fieldset disabled={readOnly || busy}>
          <legend>{t("booking.layers")}</legend>
          {layers.map((layer, index) => (
            <div className="booking-layer" key={index}>
              <label className="booking-field">
                {t("booking.material")}
                <input
                  className="text-input"
                  value={layer.material}
                  onChange={(e) =>
                    setLayers(
                      layers.map((v, i) =>
                        i === index ? { ...v, material: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <label className="booking-field">
                {t("booking.thickness")} ({usage.units.thickness})
                <input
                  className="text-input"
                  type="number"
                  min="0"
                  step="any"
                  value={layer.thickness}
                  onChange={(e) =>
                    setLayers(
                      layers.map((v, i) =>
                        i === index ? { ...v, thickness: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <button
                className="button button--secondary"
                onClick={() => setLayers(layers.filter((_, i) => i !== index))}
                aria-label={t("booking.removeLayer", { n: index + 1 })}
              >
                −
              </button>
            </div>
          ))}
          <button
            className="button button--secondary"
            onClick={() =>
              setLayers([...layers, { material: "", thickness: "" }])
            }
          >
            {t("booking.addLayer")}
          </button>
        </fieldset>
      )}
      <label className="booking-field">
        {t("booking.notes")}
        <textarea
          className="text-input"
          maxLength={4000}
          value={notes}
          disabled={readOnly || busy}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      {!readOnly && (
        <div className="booking-actions">
          {usage.status !== "submitted" && (
            <button
              className="button button--secondary"
              disabled={busy}
              onClick={() => onSave(fields(), notes, "draft")}
            >
              {t("booking.saveDraft")}
            </button>
          )}
          {inUse && (
            <>
              <button
                className="button button--secondary"
                disabled={busy}
                onClick={() => onSave(fields(), notes, "end")}
              >
                {t("booking.endLater")}
              </button>
              <button
                className="button button--primary"
                disabled={busy}
                onClick={() => onSave(fields(), notes, "submit_and_end")}
              >
                {t("booking.submitEnd")}
              </button>
            </>
          )}
          {completed && (
            <button
              className="button button--primary"
              disabled={busy}
              onClick={() => onSave(fields(), notes, "submit")}
            >
              {t("booking.submit")}
            </button>
          )}
        </div>
      )}
      <p className="muted">{t("booking.endHint")}</p>
    </section>
  );
}
