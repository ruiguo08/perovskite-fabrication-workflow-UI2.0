import { useState, type FormEvent } from "react";
import { useLanguage } from "../../i18n";
import { bookingApi } from "./api";
import { bookingError } from "../../pages/BookingPage";
import type { Equipment, Template } from "./types";
import type { UserAccount } from "../../types/api";

export const templateUnits: Record<Template, Record<string, string>> = {
  glovebox: { h2o: "ppm", o2: "ppm", temperature: "°C" },
  ald: { cycles: "cycle", temperature: "°C", pressure: "Pa" },
  evaporation: { thickness: "nm", temperature: "°C", pressure: "Pa" },
  general: {},
};
export function EquipmentEditor({
  equipment,
  users,
  admin,
  onSaved,
}: {
  equipment: Equipment;
  users: UserAccount[];
  admin: boolean;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(equipment),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<ReturnType<typeof bookingError> | null>(null),
    [saved, setSaved] = useState(false);
  const change = <K extends keyof Equipment>(key: K, value: Equipment[K]) => {
    setDraft({ ...draft, [key]: value });
    setSaved(false);
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const {
        name,
        group_code,
        equipment_type,
        location,
        bookable,
        description,
        template,
        units,
        manager_id,
      } = draft;
      await bookingApi(`equipment/${equipment.id}`, {
        method: "PATCH",
        body: {
          name,
          group_code,
          equipment_type,
          location,
          bookable,
          description,
          template,
          units,
          ...(admin ? { manager_id } : {}),
        },
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(bookingError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="booking-equipment-editor" onSubmit={(e) => void submit(e)}>
      <h2>
        {equipment.code} · {t("booking.profile")}
      </h2>
      <p className="muted">{t("booking.equipmentClosedHint")}</p>
      <fieldset
        disabled={busy}
        className="booking-form-grid booking-borderless"
      >
        <label className="booking-field">
          {t("booking.name")}
          <input
            className="text-input"
            required
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
            {!["gloveboxes", "vacuum", "other", "characterization"].includes(
              draft.group_code,
            ) && <option value={draft.group_code}>{draft.group_code}</option>}
            {["gloveboxes", "vacuum", "other", "characterization"].map(
              (group) => (
                <option value={group} key={group}>
                  {t(`booking.${group}` as "booking.gloveboxes")}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="booking-field">
          {t("booking.type")}
          <input
            className="text-input"
            required
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
            maxLength={80}
            value={draft.location}
            onChange={(e) => change("location", e.target.value)}
          />
        </label>
        {admin && (
          <label className="booking-field">
            {t("booking.manager")}
            <select
              className="text-input"
              value={draft.manager_id ?? ""}
              onChange={(e) => {
                setDraft({
                  ...draft,
                  manager_id: e.target.value ? Number(e.target.value) : null,
                  bookable: e.target.value ? draft.bookable : false,
                });
                setSaved(false);
              }}
            >
              <option value="">{t("booking.unassigned")}</option>
              {users
                .filter((account) => account.is_active)
                .map((account) => (
                  <option value={account.id} key={account.id}>
                    {account.display_name} ({account.username})
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="booking-field">
          {t("booking.template")}
          <select
            className="text-input"
            value={draft.template}
            onChange={(e) => {
              const template = e.target.value as Template;
              setDraft({
                ...draft,
                template,
                units: { ...templateUnits[template] },
              });
              setSaved(false);
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
        {"pressure" in draft.units && (
          <label className="booking-field">
            {t("booking.pressureUnit")}
            <select
              className="text-input"
              value={draft.units.pressure}
              onChange={(e) =>
                change("units", { ...draft.units, pressure: e.target.value })
              }
            >
              {["Pa", "mbar", "Torr"].map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </label>
        )}
        {"thickness" in draft.units && (
          <label className="booking-field">
            {t("booking.thicknessUnit")}
            <select
              className="text-input"
              value={draft.units.thickness}
              onChange={(e) =>
                change("units", { ...draft.units, thickness: e.target.value })
              }
            >
              {["nm", "Å"].map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </label>
        )}
        <label className="booking-field booking-field--wide">
          {t("booking.descriptionField")}
          <textarea
            className="text-input"
            maxLength={4000}
            value={draft.description}
            onChange={(e) => change("description", e.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.bookable}
            disabled={draft.manager_id === null}
            onChange={(e) => change("bookable", e.target.checked)}
          />
          {t("booking.bookable")}
        </label>
      </fieldset>
      {error && (
        <p className="booking-error" role="alert">
          {t(error)}
        </p>
      )}
      {saved && <p role="status">{t("booking.saved")}</p>}
      <button className="button button--primary" disabled={busy}>
        {t("booking.saveProfile")}
      </button>
    </form>
  );
}
