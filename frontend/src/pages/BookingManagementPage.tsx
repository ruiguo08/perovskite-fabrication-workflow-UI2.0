import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useSession } from "../auth/session";
import { useLanguage } from "../i18n";
import { apiFetch } from "../lib/api";
import { bookingApi, bookingPages } from "../features/booking/api";
import {
  addDays,
  labDate,
  labStamp,
  midnight,
} from "../features/booking/calendar";
import { EquipmentEditor } from "../features/booking/EquipmentEditor";
import { EquipmentCreator } from "../features/booking/EquipmentCreator";
import { ManagementCreate } from "../features/booking/ManagementCreate";
import { bookingError, ReservationDialog } from "./BookingPage";
import type {
  Equipment,
  CalendarRow,
  LedgerRow,
  Notice,
} from "../features/booking/types";
import type { UserAccount } from "../types/api";
import "../features/booking/booking.css";
type Panel = "profile" | "reservations" | "teamLedger" | "notices" | "register";
export function BookingManagementPage() {
  const { t, language } = useLanguage(),
    { user } = useSession();
  const admin = user?.role === "administrator";
  const [equipment, setEquipment] = useState<Equipment[]>([]),
    [users, setUsers] = useState<UserAccount[]>([]);
  const [panel, setPanel] = useState<Panel>("profile"),
    [selected, setSelected] = useState(0),
    [revision, setRevision] = useState(0);
  const [records, setRecords] = useState<CalendarRow[]>([]),
    [ledger, setLedger] = useState<LedgerRow[]>([]),
    [notices, setNotices] = useState<Notice[]>([]);
  const [start, setStart] = useState(() => addDays(labDate(), -7)),
    [end, setEnd] = useState(() => addDays(labDate(), 31));
  const [range, setRange] = useState({ start, end }),
    [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<ReturnType<typeof bookingError> | null>(null);
  const [create, setCreate] = useState<"maintenance" | "notice" | null>(null),
    [open, setOpen] = useState<CalendarRow | null>(null);
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  const managed = equipment.filter((eq) => admin || eq.manager_id === user?.id);
  const current = managed.find((eq) => eq.id === selected) ?? managed[0];
  const equipmentId = current?.id;
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    void Promise.all([
      bookingApi<Equipment[]>("equipment"),
      admin ? apiFetch<UserAccount[]>("/api/users") : Promise.resolve([]),
    ])
      .then(([eq, accounts]) => {
        if (alive) {
          setEquipment(eq);
          setUsers(accounts);
        }
      })
      .catch((err) => {
        if (alive) setError(bookingError(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [admin, revision]);
  useEffect(() => {
    let alive = true;
    setError(null);
    setRecords([]);
    setLedger([]);
    setNotices([]);
    if (!equipmentId) return;
    const query = new URLSearchParams({ equipment_id: String(equipmentId) });
    let request: Promise<void> = Promise.resolve();
    if (panel === "reservations") {
      query.set("starts_at", new Date(midnight(range.start)).toISOString());
      query.set("ends_at", new Date(midnight(range.end)).toISOString());
      query.set("history", "true");
      request = bookingPages<CalendarRow>(`reservations?${query}`).then(
        (rows) => {
          if (alive) setRecords(rows);
        },
      );
    } else if (panel === "teamLedger")
      request = bookingPages<LedgerRow>(
        `ledger?${query}&pending=${pending}`,
      ).then((rows) => {
        if (alive) setLedger(rows);
      });
    else if (panel === "notices")
      request = bookingPages<Notice>(`notices?${query}&history=true`).then(
        (rows) => {
          if (alive) setNotices(rows);
        },
      );
    void request.catch((err) => {
      if (alive) setError(bookingError(err));
    });
    return () => {
      alive = false;
    };
  }, [equipmentId, panel, range.start, range.end, pending, revision]);
  async function mutate(path: string, method: "PATCH" | "PUT", body: unknown) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await bookingApi(path, { method, body });
      reload();
    } catch (err) {
      setError(bookingError(err));
    } finally {
      setBusy(false);
    }
  }
  function search(event: FormEvent) {
    event.preventDefault();
    if (
      midnight(end) <= midnight(start) ||
      midnight(end) - midnight(start) > 93 * 86400000
    ) {
      setError("booking.invalid");
      return;
    }
    setRange({ start, end });
    reload();
  }
  function openLedger(row: LedgerRow) {
    setOpen({
      id: row.reservation_id,
      equipment_id: row.equipment_id,
      code: current?.code ?? "",
      user_id: row.user_id,
      reserved_by:
        users.find((account) => account.id === row.user_id)?.display_name ??
        t("booking.userNumber", { id: row.user_id }),
      kind: "booking",
      status: row.reservation_status,
      starts_at: row.actual_start ?? row.updated_at,
      ends_at: row.actual_end ?? row.updated_at,
      actual_start: row.actual_start,
      actual_end: row.actual_end,
    });
  }
  return (
    <div className="booking-page booking-management">
      {!loading && !admin && equipment.length > 0 && managed.length === 0 ? (
        <section className="panel">
          <h1>{t("booking.manage")}</h1>
          <p>{t("booking.manageDenied")}</p>
          <Link className="button button--secondary" to="/booking">
            {t("booking.back")}
          </Link>
        </section>
      ) : (
      <>
      <div className="booking-page__header">
        <div>
          <h1>{t("booking.manage")}</h1>
          <p>{t("booking.manageDescription")}</p>
        </div>
        <Link className="button button--secondary" to="/booking">
          {t("booking.back")}
        </Link>
      </div>
      {error && (
        <p className="booking-error" role="alert">
          {t(error)}{" "}
          <button className="button button--secondary" onClick={reload}>
            {t("common.retry")}
          </button>
        </p>
      )}
      {loading && <p role="status">{t("common.loading")}</p>}
      <div className="booking-tabs">
        {(
          [
            "profile",
            "reservations",
            "teamLedger",
            "notices",
            ...(admin ? ["register"] : []),
          ] as Panel[]
        ).map((tab) => (
          <button
            key={tab}
            className="button button--secondary"
            aria-pressed={panel === tab}
            onClick={() => setPanel(tab)}
          >
            {t(`booking.${tab}`)}
          </button>
        ))}
      </div>
      {panel === "register" && admin ? (
        <section className="panel">
          <EquipmentCreator
            onCreated={(id) => {
              reload();
              setSelected(id);
              setPanel("profile");
            }}
          />
        </section>
      ) : (
        <>
          {managed.length === 0 && !loading ? (
            <p>{t("booking.noManaged")}</p>
          ) : (
            current && (
              <>
                <label className="booking-field booking-managed-select">
                  {t("booking.equipment")}
                  <select
                    className="text-input"
                    value={current.id}
                    onChange={(e) => setSelected(Number(e.target.value))}
                  >
                    {managed.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.code} · {eq.name}
                      </option>
                    ))}
                  </select>
                </label>
                <section className="panel">
                  {panel === "profile" && (
                    <EquipmentEditor
                      key={current.id}
                      equipment={current}
                      users={users}
                      admin={admin}
                      onSaved={reload}
                    />
                  )}
                  {panel === "reservations" && (
                    <>
                      <div className="booking-page__header">
                        <h2>{t("booking.reservations")}</h2>
                        <button
                          className="button button--primary"
                          onClick={() => setCreate("maintenance")}
                        >
                          {t("booking.newMaintenance")}
                        </button>
                      </div>
                      <form className="booking-range" onSubmit={search}>
                        <label className="booking-field">
                          {t("booking.rangeStart")}
                          <input
                            className="text-input"
                            type="date"
                            required
                            value={start}
                            onChange={(e) => setStart(e.target.value)}
                          />
                        </label>
                        <label className="booking-field">
                          {t("booking.rangeEnd")}
                          <input
                            className="text-input"
                            type="date"
                            required
                            value={end}
                            onChange={(e) => setEnd(e.target.value)}
                          />
                        </label>
                        <button className="button button--secondary">
                          {t("booking.search")}
                        </button>
                      </form>
                      <div className="booking-list">
                        {records.map((row) => (
                          <button
                            className="booking-record"
                            key={row.id}
                            data-reservation-id={row.id}
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
                        {records.length === 0 && <p>{t("common.empty")}</p>}
                      </div>
                    </>
                  )}
                  {panel === "teamLedger" && (
                    <>
                      <h2>{t("booking.teamLedger")}</h2>
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
                        {ledger.map((row) => (
                          <button
                            key={row.id}
                            className="booking-record"
                            onClick={() => openLedger(row)}
                          >
                            <strong>
                              #{row.reservation_id} ·{" "}
                              {users.find(
                                (account) => account.id === row.user_id,
                              )?.display_name ??
                                t("booking.userNumber", { id: row.user_id })}
                            </strong>
                            <span>
                              {t(`booking.${row.reservation_status}`)} ·{" "}
                              {t(`booking.${row.status}`)}
                            </span>
                          </button>
                        ))}
                        {ledger.length === 0 && <p>{t("common.empty")}</p>}
                      </div>
                    </>
                  )}
                  {panel === "notices" && (
                    <>
                      <div className="booking-page__header">
                        <h2>{t("booking.noticeHistory")}</h2>
                        <button
                          className="button button--primary"
                          onClick={() => setCreate("notice")}
                        >
                          {t("booking.newNotice")}
                        </button>
                      </div>
                      {notices.map((notice) => (
                        <article className="booking-notice" key={notice.id}>
                          <strong>
                            #{notice.id} ·{" "}
                            {t(
                              notice.withdrawn_at
                                ? "booking.withdrawn"
                                : Date.parse(notice.valid_until) <= Date.now()
                                  ? "booking.expired"
                                  : Date.parse(notice.valid_from) > Date.now()
                                    ? "booking.scheduled"
                                    : "booking.active",
                            )}
                            {notice.pinned && ` · ${t("booking.pinned")}`}
                          </strong>
                          <p>{notice.body}</p>
                          <p className="muted">
                            {labStamp(notice.valid_from, language)} –{" "}
                            {labStamp(notice.valid_until, language)}
                          </p>
                          {!notice.withdrawn_at && (
                            <div className="booking-actions">
                              <button
                                className="button button--secondary"
                                disabled={busy}
                                onClick={() =>
                                  void mutate(`notices/${notice.id}`, "PATCH", {
                                    pinned: !notice.pinned,
                                  })
                                }
                              >
                                {t(
                                  notice.pinned
                                    ? "booking.unpin"
                                    : "booking.pin",
                                )}
                              </button>
                              <button
                                className="button button--danger"
                                disabled={busy}
                                onClick={() =>
                                  void mutate(`notices/${notice.id}`, "PATCH", {
                                    withdraw: true,
                                  })
                                }
                              >
                                {t("booking.withdraw")}
                              </button>
                            </div>
                          )}
                        </article>
                      ))}
                      {notices.length === 0 && <p>{t("common.empty")}</p>}
                    </>
                  )}
                </section>
              </>
            )
          )}
        </>
      )}
      {create && current && (
        <ManagementCreate
          equipmentId={current.id}
          kind={create}
          onClose={() => setCreate(null)}
          onSaved={() => {
            setCreate(null);
            reload();
          }}
        />
      )}
      {open && (
        <ReservationDialog
          key={open.id}
          row={open}
          equipment={equipment.find((eq) => eq.id === open.equipment_id)}
          management
          onClose={() => setOpen(null)}
          onSaved={reload}
        />
      )}
      </>
      )}
    </div>
  );
}
