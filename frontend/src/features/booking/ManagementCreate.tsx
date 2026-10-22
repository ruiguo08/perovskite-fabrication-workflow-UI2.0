import { useRef, useState, type FormEvent } from "react";
import { useLanguage } from "../../i18n";
import { bookingApi } from "./api";
import { bookingError } from "../../pages/BookingPage";
import { labInput, labIso } from "./calendar";
import { BookingDialog } from "./BookingDialog";

export function ManagementCreate({
  equipmentId,
  kind,
  onClose,
  onSaved,
}: {
  equipmentId: number;
  kind: "maintenance" | "notice";
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [starts, setStarts] = useState(() =>
    labInput(new Date(Date.now() + (kind === "maintenance" ? 3600000 : 0))),
  );
  const [ends, setEnds] = useState(() =>
    labInput(
      new Date(Date.now() + (kind === "maintenance" ? 7200000 : 86400000)),
    ),
  );
  const [body, setBody] = useState(""),
    [pin, setPin] = useState(false),
    [notify, setNotify] = useState(false),
    [horizon, setHorizon] = useState(() =>
      labInput(new Date(Date.now() + 86400000)),
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<ReturnType<typeof bookingError> | null>(null);
  const request = useRef({ key: crypto.randomUUID(), signature: "" });
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload =
        kind === "maintenance"
          ? {
              equipment_id: equipmentId,
              kind,
              starts_at: labIso(starts),
              ends_at: labIso(ends),
              reason: body,
            }
          : {
              equipment_id: equipmentId,
              body,
              pinned: pin,
              valid_from: labIso(starts),
              valid_until: labIso(ends),
              notify_until: notify ? labIso(horizon) : null,
            };
      const signature = JSON.stringify(payload);
      if (request.current.signature && request.current.signature !== signature)
        request.current.key = crypto.randomUUID();
      request.current.signature = signature;
      await bookingApi(kind === "maintenance" ? "reservations" : "notices", {
        method: "POST",
        body: { ...payload, request_key: request.current.key },
      });
      onSaved();
    } catch (err) {
      setError(bookingError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <BookingDialog
      title={t(
        kind === "maintenance" ? "booking.newMaintenance" : "booking.newNotice",
      )}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={(e) => void submit(e)}>
        <fieldset disabled={busy} className="booking-borderless">
          <div className="booking-form-grid">
            <label className="booking-field">
              {t(
                kind === "maintenance" ? "booking.starts" : "booking.validFrom",
              )}
              <input
                className="text-input"
                type="datetime-local"
                required
                value={starts}
                onChange={(e) => setStarts(e.target.value)}
              />
            </label>
            <label className="booking-field">
              {t(
                kind === "maintenance" ? "booking.ends" : "booking.validUntil",
              )}
              <input
                className="text-input"
                type="datetime-local"
                required
                value={ends}
                onChange={(e) => setEnds(e.target.value)}
              />
            </label>
          </div>
          <label className="booking-field">
            {t(kind === "maintenance" ? "booking.reason" : "booking.body")}
            <textarea
              className="text-input"
              required
              maxLength={4000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          {kind === "notice" && (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={pin}
                  onChange={(e) => setPin(e.target.checked)}
                />
                {t("booking.pinned")}
              </label>
              <label className="booking-field">
                <span>
                  <input
                    type="checkbox"
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                  />
                  {t("booking.notify")}
                </span>
              </label>
              {notify && (
                <label className="booking-field">
                  {t("booking.notifyUntil")}
                  <input
                    className="text-input"
                    type="datetime-local"
                    required
                    value={horizon}
                    max={labInput(new Date(Date.now() + 31 * 86400000))}
                    onChange={(e) => setHorizon(e.target.value)}
                  />
                </label>
              )}
            </>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="booking-error">
            {t(error)}
          </p>
        )}
        <button
          className="button button--primary"
          disabled={busy || !body.trim()}
        >
          {t(
            kind === "maintenance"
              ? "booking.newMaintenance"
              : "booking.newNotice",
          )}
        </button>
      </form>
    </BookingDialog>
  );
}
