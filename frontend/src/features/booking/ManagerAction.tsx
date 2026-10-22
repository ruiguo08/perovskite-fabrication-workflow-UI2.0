import { useState } from "react";
import { useLanguage } from "../../i18n";
import type { CalendarRow, Reservation } from "./types";
import { useNow } from "./useNow";

export function ManagerAction({
  row,
  busy,
  owner,
  onAction,
}: {
  row: CalendarRow | Reservation;
  busy: boolean;
  owner: boolean;
  onAction: (action: string, reason: string) => void;
}) {
  const { t } = useLanguage();
  const now = useNow();
  const [reason, setReason] = useState("");
  const choices = [
    ...(row.kind === "maintenance" && row.status === "blocked"
      ? [{ value: "release", label: "booking.release" as const }]
      : []),
    ...(row.kind === "booking" &&
    row.status === "planned" &&
    !owner &&
    Date.parse(row.starts_at) > now
      ? [{ value: "cancel", label: "booking.cancelOther" as const }]
      : []),
    ...(row.kind === "booking" &&
    row.status === "planned" &&
    Date.parse(row.ends_at) <= now
      ? [{ value: "no_show", label: "booking.markNoShow" as const }]
      : []),
    ...(row.status === "in_use"
      ? [{ value: "force_end", label: "booking.forceEnd" as const }]
      : []),
  ];
  const [choice, setChoice] = useState("");
  const current = choices.find((item) => item.value === choice) ?? choices[0];
  if (!current) return null;
  return (
    <form
      className="booking-manager-action"
      onSubmit={(e) => {
        e.preventDefault();
        onAction(current.value, reason);
      }}
    >
      <h3>{t("booking.managerAction")}</h3>
      <p>{t("booking.managerHint")}</p>
      <label className="booking-field">
        {t("booking.action")}
        <select
          className="text-input"
          disabled={busy}
          value={current.value}
          onChange={(e) => setChoice(e.target.value)}
        >
          {choices.map((item) => (
            <option key={item.value} value={item.value}>
              {t(item.label)}
            </option>
          ))}
        </select>
      </label>
      <label className="booking-field">
        {t("booking.reason")}
        <textarea
          className="text-input"
          required
          maxLength={4000}
          disabled={busy}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <button
        className="button button--danger"
        disabled={busy || !reason.trim()}
      >
        {t(current.label)}
      </button>
    </form>
  );
}
