import { useState, type FormEvent } from "react";
import { useLanguage } from "../../i18n";
import { bookingApi } from "./api";
import { bookingError } from "../../pages/BookingPage";
import { templateUnits } from "./EquipmentEditor";
import type { Template } from "./types";

export const GROUPS = ["gloveboxes", "vacuum", "other", "characterization"] as const;

type Draft = {
  code: string;
  name: string;
  group_code: string;
  equipment_type: string;
  location: string;
  template: Template;
  description: string;
};

export function EquipmentCreator({
  onCreated,
}: {
  onCreated: (id: number) => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<Draft>({
    code: "",
    name: "",
    group_code: "gloveboxes",
    equipment_type: "",
    location: "",
    template: "general",
    description: "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<ReturnType<typeof bookingError> | null>(null);
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft({ ...draft, [key]: value });
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const created = await bookingApi<{ id: number }>("equipment", {
        method: "POST",
        body: {
          ...draft,
          code: draft.code.trim(),
          name: draft.name.trim(),
        },
      });
      onCreated(created.id);
      setDraft({
        code: "",
        name: "",
        group_code: "gloveboxes",
        equipment_type: "",
        location: "",
        template: "general",
        description: "",
      });
    } catch (err) {
      setError(bookingError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="booking-equipment-editor" onSubmit={(e) => void submit(e)}>
      <h2>{t("booking.newEquipment")}</h2>
      <p className="muted">{t("booking.newEquipmentHint")}</p>
      <fieldset disabled={busy} className="booking-form-grid booking-borderless">
        <label className="booking-field">
          {t("booking.code")}
          <input
            className="text-input"
            required
            minLength={1}
            maxLength={24}
            value={draft.code}
            onChange={(e) => change("code", e.target.value)}
          />
        </label>
        <label className="booking-field">
          {t("booking.name")}
          <input
            className="text-input"
            required
            minLength={1}
            maxLength={160}
            value={draft.name}
            onChange={(e) => change("name", e.target.value)}
          />
        </label>
        <label className="booking-field">
          {t("booking.group")}
          <select
            className="text-input"
            value={draft.group_code}
            onChange={(e) => change("group_code", e.target.value)}
          >
            {GROUPS.map((group) => (
              <option value={group} key={group}>
                {t(`booking.${group}` as "booking.gloveboxes")}
              </option>
            ))}
          </select>
        </label>
        <label className="booking-field">
          {t("booking.type")}
          <input
            className="text-input"
            required
            minLength={1}
            maxLength={40}
            value={draft.equipment_type}
            onChange={(e) => change("equipment_type", e.target.value)}
          />
        </label>
        <label className="booking-field">
          {t("booking.location")}
          <input
            className="text-input"
            required
            minLength={1}
            maxLength={80}
            value={draft.location}
            onChange={(e) => change("location", e.target.value)}
          />
        </label>
        <label className="booking-field">
          {t("booking.template")}
          <select
            className="text-input"
            value={draft.template}
            onChange={(e) => {
              const template = e.target.value as Template;
              change("template", template);
            }}
          >
            {(["glovebox", "ald", "evaporation", "general"] as const).map(
              (template) => (
                <option value={template} key={template}>
                  {t(`booking.${template}`)}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="booking-field booking-field--wide">
          {t("booking.descriptionField")}
          <textarea
            className="text-input"
            maxLength={4000}
            value={draft.description}
            onChange={(e) => change("description", e.target.value)}
          />
        </label>
      </fieldset>
      {error && (
        <p className="booking-error" role="alert">
          {t(error)}
        </p>
      )}
      <button className="button button--primary" disabled={busy}>
        {t("booking.createEquipment")}
      </button>
      <p className="muted">
        {t("booking.templateUnitsHint")}:{" "}
        {Object.keys(templateUnits[draft.template]).join(", ") || "—"}
      </p>
    </form>
  );
}
