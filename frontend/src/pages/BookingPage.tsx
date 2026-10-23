import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useSession } from "../auth/session";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n";
import { ApiError } from "../lib/api";
import { bookingApi, bookingPages } from "../features/booking/api";
import { Calendar } from "../features/booking/BookingCalendar";
import {
  addDays,
  labDate,
  labInput,
  labIso,
  labStamp,
  rangeFor,
  type CalendarView,
} from "../features/booking/calendar";
import { BookingDialog } from "../features/booking/BookingDialog";
import { UsageForm } from "../features/booking/UsageForm";
import { ManagerAction } from "../features/booking/ManagerAction";
import { useNow } from "../features/booking/useNow";
import type {
  CalendarRow,
  Equipment,
  LedgerRow,
  Notice,
  Notification,
  Reservation,
  Usage,
} from "../features/booking/types";
import "../features/booking/booking.css";

export function BookingPage() {
  const { t, language } = useLanguage(),
    { user } = useSession();
  const [date, setDate] = useState(labDate),
    [view, setView] = useState<CalendarView>("week");
  const [equipment, setEquipment] = useState<Equipment[]>([]),
    [selected, setSelected] = useState<number[] | null>(null);
  const [rows, setRows] = useState<CalendarRow[]>([]),
    [notices, setNotices] = useState<Notice[]>([]),
    [inbox, setInbox] = useState<Notification[]>([]),
    [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [history, setHistory] = useState(false),
    [pending, setPending] = useState(false),
    [panel, setPanel] = useState<"calendar" | "ledger" | "inbox">("calendar");
  const [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  const [create, setCreate] = useState(false),
    [open, setOpen] = useState<CalendarRow | null>(null);
  const [noticeOpen, setNoticeOpen] = useState<Notice | null>(null);
  const range = rangeFor(date, view);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    void Promise.all([
      bookingApi<Equipment[]>("equipment"),
      bookingPages<CalendarRow>(
        `reservations?${new URLSearchParams({ starts_at: range.start, ends_at: range.end, history: String(history) })}`,
      ),
      bookingPages<Notice>("notices"),
      bookingPages<Notification>("notifications"),
      bookingPages<LedgerRow>(`ledger?pending=${pending}`),
    ])
      .then(([eq, res, ns, notifications, records]) => {
        if (alive) {
          setEquipment(eq);
          setRows(res);
          setNotices(ns);
          setInbox(notifications);
          setLedger(records);
        }
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [range.start, range.end, history, pending, revision]);
  const visible = equipment.filter(
    (eq) => selected === null || selected.includes(eq.id),
  );
  const visibleIds = new Set(visible.map((eq) => eq.id));
  const filteredRows = rows.filter((row) => visibleIds.has(row.equipment_id));
  const mainRows = filteredRows.filter(
    (row) => !["cancelled", "no_show", "released"].includes(row.status),
  );
  const refresh = () => setRevision((value) => value + 1);
  function move(direction: number) {
    if (view === "month") {
      const d = new Date(`${date.slice(0, 7)}-01T12:00:00+08:00`);
      d.setUTCMonth(d.getUTCMonth() + direction);
      setDate(labDate(d));
    } else setDate(addDays(date, direction * (view === "week" ? 7 : 1)));
  }
  async function read(notification: Notification) {
    try {
      const result = await bookingApi<Notification>(
        `notifications/${notification.id}/read`,
        { method: "POST" },
      );
      setInbox((items) =>
        items.map((item) => (item.id === result.id ? result : item)),
      );
    } catch {
      setError(true);
    }
  }
  async function openNotification(notification: Notification) {
    try {
      if (notification.reservation_id) {
        const res = await bookingApi<Reservation>(
          `reservations/${notification.reservation_id}`,
        );
        setOpen({
          ...res,
          code: equipment.find((eq) => eq.id === res.equipment_id)?.code ?? "",
          reserved_by: user?.display_name ?? "",
        });
      } else {
        setNoticeOpen(
          await bookingApi<Notice>(`notices/${notification.notice_id}`),
        );
      }
      await read(notification);
    } catch {
      setError(true);
    }
  }
  return (
    <div className="booking-page">
      <div className="booking-page__header">
        <div>
          <h1>{t("booking.title")}</h1>
          <p>{t("booking.description")}</p>
        </div>
        <button
          className="button button--primary"
          onClick={() => setCreate(true)}
          disabled={!equipment.some((eq) => eq.bookable)}
        >
          {t("booking.new")}
        </button>
      </div>
      {error && (
        <div className="booking-error" role="alert">
          {t("booking.loadError")}{" "}
          <button className="button button--secondary" onClick={refresh}>
            {t("common.retry")}
          </button>
        </div>
      )}
      <section className="booking-notices" aria-label={t("booking.notices")}>
        <h2>{t("booking.notices")}</h2>
        {notices.filter((notice) => visibleIds.has(notice.equipment_id))
          .length === 0 ? (
          <p>{t("booking.noNotices")}</p>
        ) : (
          notices
            .filter((notice) => visibleIds.has(notice.equipment_id))
            .map((notice) => (
              <div key={notice.id} className="booking-notice">
                <strong>
                  {equipment.find((eq) => eq.id === notice.equipment_id)?.code}{" "}
                  {notice.pinned && `· ${t("booking.pinned")}`}
                </strong>
                <p>{notice.body}</p>
                <small>{labStamp(notice.valid_until, language)}</small>
              </div>
            ))
        )}
      </section>
      <div
        className="booking-tabs"
        role="group"
        aria-label={t("booking.title")}
      >
        {(user?.role === "administrator" ||
          equipment.some((eq) => eq.manager_id === user?.id)) && (
          <Link className="button button--secondary" to="/booking/manage">
            {t("booking.manage")}
          </Link>
        )}
        {(["calendar", "ledger", "inbox"] as const).map((key) => (
          <button
            key={key}
            className="button button--secondary"
            aria-pressed={panel === key}
            onClick={() => setPanel(key)}
          >
            {t(key === "calendar" ? "booking.title" : `booking.${key}`)}
            {key === "inbox"
              ? ` (${inbox.filter((item) => !item.read_at).length})`
              : ""}
          </button>
        ))}
        <button
          className="button button--secondary"
          onClick={refresh}
          disabled={loading}
        >
          {t("booking.refresh")}
        </button>
      </div>
      <div className="booking-layout" aria-busy={loading}>
        <aside className="booking-filters">
          <h2>{t("booking.equipment")}</h2>
          <div className="booking-filter-actions">
            <button onClick={() => setSelected(null)}>
              {t("booking.all")}
            </button>
            <button onClick={() => setSelected([])}>{t("booking.none")}</button>
          </div>
          {Array.from(
            new Set([
              "gloveboxes",
              "vacuum",
              "other",
              "characterization",
              ...equipment.map((eq) => eq.group_code),
            ]),
          ).map((group) => (
            <fieldset key={group}>
              <legend>
                {["gloveboxes", "vacuum", "other", "characterization"].includes(
                  group,
                )
                  ? t(`booking.${group}` as "booking.gloveboxes")
                  : group}
              </legend>
              {equipment
                .filter((eq) => eq.group_code === group)
                .map((eq) => (
                  <label className="booking-equipment-option" key={eq.id}>
                    <input
                      type="checkbox"
                      checked={visibleIds.has(eq.id)}
                      onChange={() =>
                        setSelected(
                          visibleIds.has(eq.id)
                            ? visible
                                .filter((item) => item.id !== eq.id)
                                .map((item) => item.id)
                            : [...visibleIds, eq.id],
                        )
                      }
                    />
                    <span>
                      <strong>{eq.code}</strong> {eq.name}
                      {!eq.bookable && <small>{t("booking.closed")}</small>}
                    </span>
                  </label>
                ))}
            </fieldset>
          ))}
        </aside>
        <section className="booking-workspace">
          {loading && (
            <p className="booking-loading" role="status">
              {t("common.loading")}
            </p>
          )}
          {panel === "calendar" && (
            <>
              <div className="booking-toolbar">
                <div className="booking-actions">
                  <button
                    className="button button--secondary"
                    onClick={() => move(-1)}
                    aria-label={t("booking.previous")}
                  >
                    ‹
                  </button>
                  <button
                    className="button button--secondary"
                    onClick={() => setDate(labDate())}
                  >
                    {t("booking.today")}
                  </button>
                  <button
                    className="button button--secondary"
                    onClick={() => move(1)}
                    aria-label={t("booking.next")}
                  >
                    ›
                  </button>
                  <input
                    className="text-input"
                    type="date"
                    aria-label={t("booking.date")}
                    value={date}
                    onChange={(e) => {
                      if (e.target.value) setDate(e.target.value);
                    }}
                  />
                </div>
                <div className="booking-view-picker">
                  {(["day", "week", "month"] as const).map((key) => (
                    <button
                      key={key}
                      aria-pressed={view === key}
                      onClick={() => setView(key)}
                    >
                      {t(`booking.${key}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="booking-legend">
                {(["planned", "in_use", "completed", "blocked"] as const).map(
                  (status) => (
                    <span key={status}>
                      <i className={`booking-dot booking-dot--${status}`} />
                      {t(`booking.${status}`)}
                    </span>
                  ),
                )}
              </div>
              <Calendar
                view={view}
                date={date}
                days={range.days}
                equipment={visible}
                rows={mainRows}
                onDay={(day) => {
                  setDate(day);
                  setView("day");
                }}
                onOpen={setOpen}
              />
              <details className="booking-history">
                <summary>{t("booking.historyTitle")}</summary>
                <label>
                  <input
                    type="checkbox"
                    checked={history}
                    onChange={(e) => setHistory(e.target.checked)}
                  />
                  {t("booking.history")}
                </label>
                {filteredRows.length === 0 ? (
                  <p>{t("booking.empty")}</p>
                ) : (
                  <div className="booking-list">
                    {filteredRows.map((row) => (
                      <button
                        className={`booking-record booking-record--${row.status}`}
                        key={row.id}
                        onClick={() => setOpen(row)}
                      >
                        <strong>
                          {row.code} · {row.reserved_by}
                        </strong>
                        <span>
                          {labStamp(row.starts_at, language)} –{" "}
                          {labStamp(row.ends_at, language)}
                        </span>
                        <span>{t(`booking.${row.status}`)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </details>
            </>
          )}
          {panel === "ledger" && (
            <div className="booking-records">
              <h2>{t("booking.ledger")}</h2>
              <p>{t("booking.private")}</p>
              <label>
                <input
                  type="checkbox"
                  checked={pending}
                  onChange={(e) => setPending(e.target.checked)}
                />
                {t("booking.pendingOnly")}
              </label>
              <div className="booking-list">
                {ledger
                  .filter(
                    (row) =>
                      row.user_id === user?.id &&
                      visibleIds.has(row.equipment_id),
                  )
                  .map((row) => (
                    <button
                      className="booking-record"
                      key={row.id}
                      onClick={() => {
                        setOpen({
                          id: row.reservation_id,
                          equipment_id: row.equipment_id,
                          code:
                            equipment.find((eq) => eq.id === row.equipment_id)
                              ?.code ?? "",
                          user_id: row.user_id,
                          reserved_by: user?.display_name ?? "",
                          kind: "booking",
                          status: row.reservation_status,
                          starts_at: row.actual_start ?? row.updated_at,
                          ends_at: row.actual_end ?? row.updated_at,
                          actual_start: row.actual_start,
                          actual_end: row.actual_end,
                        });
                      }}
                    >
                      <strong>
                        {
                          equipment.find((eq) => eq.id === row.equipment_id)
                            ?.code
                        }{" "}
                        · #{row.reservation_id}
                      </strong>
                      <span>
                        {t(`booking.${row.status}`)} ·{" "}
                        {t(`booking.${row.reservation_status}`)}
                      </span>
                    </button>
                  ))}
                {!ledger.some(
                  (row) =>
                    row.user_id === user?.id &&
                    visibleIds.has(row.equipment_id),
                ) && <p>{t("common.empty")}</p>}
              </div>
            </div>
          )}
          {panel === "inbox" && (
            <div className="booking-records">
              <h2>{t("booking.inbox")}</h2>
              {inbox.length === 0 && <p>{t("booking.noInbox")}</p>}
              {inbox.map((notification) => (
                <article className="booking-notification" key={notification.id}>
                  <strong>
                    {t(`booking.${notification.event}`, {
                      id: notification.reservation_id ?? notification.notice_id,
                    })}
                  </strong>
                  <p>
                    {labStamp(notification.created_at, language)} ·{" "}
                    {t(
                      notification.read_at
                        ? "booking.readAlready"
                        : "booking.unread",
                    )}
                  </p>
                  <div className="booking-actions">
                    <button
                      className="button button--secondary"
                      onClick={() => void openNotification(notification)}
                    >
                      {t("booking.open")}
                    </button>
                    {!notification.read_at && (
                      <button
                        className="button button--secondary"
                        onClick={() => void read(notification)}
                      >
                        {t("booking.read")}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      {create && (
        <NewBooking
          equipment={equipment}
          date={date}
          onClose={() => setCreate(false)}
          onSaved={() => {
            setCreate(false);
            refresh();
          }}
        />
      )}
      {open && (
        <ReservationDialog
          key={open.id}
          row={open}
          equipment={equipment.find((eq) => eq.id === open.equipment_id)}
          onClose={() => setOpen(null)}
          onSaved={refresh}
        />
      )}
      {noticeOpen && (
        <BookingDialog
          title={t("booking.notices")}
          onClose={() => setNoticeOpen(null)}
        >
          <p className="booking-body">{noticeOpen.body}</p>
          <p>
            {labStamp(noticeOpen.valid_from, language)} –{" "}
            {labStamp(noticeOpen.valid_until, language)} ·{" "}
            {t(
              noticeOpen.withdrawn_at
                ? "booking.withdrawn"
                : Date.parse(noticeOpen.valid_until) <= Date.now()
                  ? "booking.expired"
                  : "booking.active",
            )}
          </p>
        </BookingDialog>
      )}
    </div>
  );
}

export function bookingError(
  error: unknown,
):
  | "booking.conflict"
  | "booking.denied"
  | "booking.invalid"
  | "booking.failed"
  | "booking.overrun" {
  if (
    error instanceof ApiError &&
    error.message.includes("equipment remains in use")
  )
    return "booking.overrun";
  return error instanceof ApiError
    ? error.status === 409
      ? "booking.conflict"
      : error.status === 403
        ? "booking.denied"
        : error.status === 422
          ? "booking.invalid"
          : "booking.failed"
    : "booking.failed";
}

function NewBooking({
  equipment,
  date,
  onClose,
  onSaved,
}: {
  equipment: Equipment[];
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [equipmentId, setEquipmentId] = useState(
    equipment.find((eq) => eq.bookable)?.id ?? 0,
  );
  const initial = labInput(new Date(Date.now() + 3600000));
  const [starts, setStarts] = useState(
      date === labDate() ? initial : `${date}T09:00`,
    ),
    [ends, setEnds] = useState(
      date === labDate()
        ? labInput(new Date(Date.now() + 7200000))
        : `${date}T10:00`,
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
      const body = {
        equipment_id: equipmentId,
        starts_at: labIso(starts),
        ends_at: labIso(ends),
      };
      const signature = JSON.stringify(body);
      if (request.current.signature && request.current.signature !== signature)
        request.current.key = crypto.randomUUID();
      request.current.signature = signature;
      await bookingApi("reservations", {
        method: "POST",
        body: { ...body, request_key: request.current.key },
      });
      onSaved();
    } catch (err) {
      setError(bookingError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <BookingDialog title={t("booking.new")} onClose={onClose} busy={busy}>
      <form onSubmit={(event) => void submit(event)}>
        <div className="booking-form-grid">
          <label className="booking-field booking-field--wide">
            {t("booking.equipment")}
            <select
              className="text-input"
              value={equipmentId}
              onChange={(e) => setEquipmentId(Number(e.target.value))}
            >
              {equipment
                .filter((eq) => eq.bookable)
                .map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.code} · {eq.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="booking-field">
            {t("booking.starts")}
            <input
              type="datetime-local"
              className="text-input"
              required
              value={starts}
              onChange={(e) => setStarts(e.target.value)}
            />
          </label>
          <label className="booking-field">
            {t("booking.ends")}
            <input
              type="datetime-local"
              className="text-input"
              required
              value={ends}
              onChange={(e) => setEnds(e.target.value)}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="booking-error">
            {t(error)}
          </p>
        )}
        <button className="button button--primary" disabled={busy}>
          {busy ? t("common.loading") : t("booking.create")}
        </button>
      </form>
    </BookingDialog>
  );
}

export function ReservationDialog({
  row,
  equipment,
  onClose,
  onSaved,
  management = false,
}: {
  row: CalendarRow;
  equipment: Equipment | undefined;
  onClose: () => void;
  onSaved: () => void;
  management?: boolean;
}) {
  const { t, language } = useLanguage(),
    { user } = useSession();
  const now = useNow();
  const canRead =
    row.user_id === user?.id ||
    equipment?.manager_id === user?.id ||
    user?.role === "administrator" ||
    user?.role === "instructor";
  const [detail, setDetail] = useState<Reservation | null>(null),
    [usage, setUsage] = useState<Usage | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<ReturnType<typeof bookingError> | null>(null),
    [ready, setReady] = useState(!canRead);
  const [starts, setStarts] = useState(labInput(row.starts_at)),
    [ends, setEnds] = useState(labInput(row.ends_at));
  const owner = row.user_id === user?.id;
  const load = useCallback(async () => {
    const [res, record] = await Promise.all([
      bookingApi<Reservation>(`reservations/${row.id}`),
      bookingApi<Usage | null>(`reservations/${row.id}/usage`),
    ]);
    return { res, record };
  }, [row.id]);
  useEffect(() => {
    let alive = true;
    if (canRead)
      void load()
        .then(({ res, record }) => {
          if (alive) {
            setDetail(res);
            setUsage(record);
            setReady(true);
            setStarts(labInput(res.starts_at));
            setEnds(labInput(res.ends_at));
          }
        })
        .catch((err) => {
          if (alive) setError(bookingError(err));
        });
    return () => {
      alive = false;
    };
  }, [canRead, load]);
  const status = detail?.status ?? row.status;
  async function mutate(
    path: string,
    method: "POST" | "PUT" | "PATCH",
    body: unknown,
  ) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await bookingApi(path, { method, body });
      const { res, record } = await load();
      setDetail(res);
      setUsage(record);
      onSaved();
    } catch (err) {
      setError(bookingError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <BookingDialog
      title={`${row.code} · ${t("booking.details", { id: row.id })}`}
      onClose={onClose}
      busy={busy}
    >
      <p>
        {row.reserved_by} · {t(`booking.${status}`)}
      </p>
      <p>
        {labStamp(detail?.starts_at ?? row.starts_at, language)} –{" "}
        {labStamp(detail?.ends_at ?? row.ends_at, language)}
      </p>
      {detail?.actual_start && (
        <p>
          {t("booking.actualStart")}: {labStamp(detail.actual_start, language)}
        </p>
      )}
      {detail?.actual_end && (
        <p>
          {t("booking.actualEnd")}: {labStamp(detail.actual_end, language)}
        </p>
      )}
      {detail?.reason && (
        <p className="booking-body">
          {t("booking.reason")}: {detail.reason}
        </p>
      )}
      {error && (
        <p role="alert" className="booking-error">
          {t(error)}{" "}
          <button
            className="button button--secondary"
            disabled={busy}
            onClick={() => {
              setError(null);
              void load()
                .then(({ res, record }) => {
                  setDetail(res);
                  setUsage(record);
                  setReady(true);
                })
                .catch((err) => setError(bookingError(err)));
            }}
          >
            {t("common.retry")}
          </button>
        </p>
      )}
      {!ready && !error && <p role="status">{t("common.loading")}</p>}
      {owner && ready && status === "planned" && (
        <>
          <div className="booking-actions">
            <button
              className="button button--primary"
              disabled={
                busy ||
                Date.parse(detail?.starts_at ?? row.starts_at) > now ||
                Date.parse(detail?.ends_at ?? row.ends_at) <= now
              }
              onClick={() =>
                void mutate(`reservations/${row.id}/actions`, "POST", {
                  action: "start",
                })
              }
            >
              {t("booking.start")}
            </button>
            <button
              className="button button--secondary"
              disabled={busy}
              onClick={() =>
                void mutate(`reservations/${row.id}/actions`, "POST", {
                  action: "cancel",
                })
              }
            >
              {t("booking.cancel")}
            </button>
          </div>
          {Date.parse(detail?.starts_at ?? row.starts_at) > now && (
            <form
              className="booking-form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void mutate(`reservations/${row.id}/time`, "PATCH", {
                  starts_at: labIso(starts),
                  ends_at: labIso(ends),
                });
              }}
            >
              <label className="booking-field">
                {t("booking.starts")}
                <input
                  className="text-input"
                  type="datetime-local"
                  required
                  value={starts}
                  onChange={(e) => setStarts(e.target.value)}
                />
              </label>
              <label className="booking-field">
                {t("booking.ends")}
                <input
                  className="text-input"
                  type="datetime-local"
                  required
                  value={ends}
                  onChange={(e) => setEnds(e.target.value)}
                />
              </label>
              <button className="button button--secondary" disabled={busy}>
                {t("booking.reschedule")}
              </button>
            </form>
          )}
        </>
      )}
      {management &&
        ready &&
        (equipment?.manager_id === user?.id ||
          user?.role === "administrator") && (
          <ManagerAction
            row={detail ?? row}
            busy={busy}
            owner={owner}
            onAction={(action, reason) =>
              void mutate(`reservations/${row.id}/actions`, "POST", {
                action,
                reason,
              })
            }
          />
        )}
      {usage && ready && (
        <UsageForm
          key={`${usage.id}:${usage.updated_at}`}
          usage={usage}
          busy={busy}
          readOnly={!owner || ["cancelled", "no_show"].includes(status)}
          inUse={status === "in_use"}
          completed={status === "completed"}
          onSave={(fields, notes, mode) => {
            if (mode === "submit_and_end" || mode === "end")
              void mutate(`reservations/${row.id}/actions`, "POST", {
                action: mode,
                fields,
                notes,
              });
            else
              void mutate(`reservations/${row.id}/usage`, "PUT", {
                fields,
                notes,
                submit: mode === "submit",
              });
          }}
        />
      )}
      {!canRead && <p>{t("booking.private")}</p>}
    </BookingDialog>
  );
}
