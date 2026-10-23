import { useLanguage } from "../../i18n";
import { useEffect, useRef } from "react";
import type { CalendarRow, Equipment } from "./types";
import {
  eventLanes,
  intersects,
  labDate,
  labTime,
  type CalendarView,
} from "./calendar";

export function Calendar({
  view,
  date,
  days,
  equipment,
  rows,
  onDay,
  onOpen,
}: {
  view: CalendarView;
  date: string;
  days: string[];
  equipment: Equipment[];
  rows: CalendarRow[];
  onDay: (date: string) => void;
  onOpen: (row: CalendarRow) => void;
}) {
  const { t, language } = useLanguage();
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 8 * 48;
  }, [date, view, equipment.length]);
  if (!equipment.length)
    return <p className="booking-empty">{t("booking.selectEquipment")}</p>;
  const weekday = (day: string) =>
    new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", {
      weekday: "short",
      timeZone: "Asia/Shanghai",
    }).format(new Date(`${day}T12:00:00+08:00`));
  if (view === "month")
    return (
      <div className="booking-month" aria-label={t("booking.month")}>
        {days.slice(0, 7).map((day) => (
          <div key={day} className="booking-month__weekday">
            {weekday(day)}
          </div>
        ))}
        {days.map((day) => {
          const events = rows.filter((row) => intersects(row, day));
          const hours = events.reduce(
            (sum, row) =>
              sum +
              (Math.min(
                Date.parse(row.ends_at),
                Date.parse(`${day}T00:00:00+08:00`) + 86400000,
              ) -
                Math.max(
                  Date.parse(row.starts_at),
                  Date.parse(`${day}T00:00:00+08:00`),
                )) /
                3600000,
            0,
          );
          return (
            <button
              key={day}
              className={`booking-month__day${day.slice(0, 7) !== date.slice(0, 7) ? " booking-month__day--outside" : ""}${day === labDate() ? " booking-month__day--today" : ""}`}
              onClick={() => onDay(day)}
              aria-label={`${day} · ${t("booking.occupied", { n: events.length })}`}
            >
              <strong>{Number(day.slice(-2))}</strong>
              <span>{t("booking.occupied", { n: events.length })}</span>
              {events.length > 0 && (
                <>
                  <span
                    className="booking-density"
                    style={{
                      width: `${Math.min(100, (hours / (24 * equipment.length)) * 100)}%`,
                    }}
                  />
                  <small>
                    {t("booking.hours", { n: Math.round(hours * 10) / 10 })}
                  </small>
                </>
              )}
              <span className="booking-month__dots">
                {(["planned", "in_use", "completed", "blocked"] as const).map(
                  (status) =>
                    events.some((row) => row.status === status) && (
                      <i
                        key={status}
                        className={`booking-dot booking-dot--${status}`}
                        title={t(`booking.${status}`)}
                      />
                    ),
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  const columns =
    view === "day"
      ? equipment.map((eq) => ({
          key: String(eq.id),
          title: eq.code,
          subtitle: eq.name,
          day: date,
          events: rows.filter((row) => row.equipment_id === eq.id),
        }))
      : days.map((day) => ({
          key: day,
          title: `${weekday(day)} ${Number(day.slice(-2))}`,
          subtitle: day,
          day,
          events: rows,
        }));
  return (
    <div
      ref={scroll}
      className="booking-timeline-scroll"
      tabIndex={0}
      aria-label={t(`booking.${view}`)}
    >
      <div
        className="booking-timeline"
        style={{
          gridTemplateColumns: `52px repeat(${columns.length}, minmax(${view === "day" ? 160 : 80}px, 1fr))`,
          width: "100%",
          minWidth: 52 + columns.length * (view === "day" ? 160 : 80),
        }}
      >
        <div className="booking-timeline__corner">UTC+8</div>
        {columns.map((col) => (
          <button
            key={col.key}
            className="booking-timeline__heading"
            onClick={() => onDay(col.day)}
          >
            <strong>{col.title}</strong>
            <small>{col.subtitle}</small>
          </button>
        ))}
        <div className="booking-timeline__times">
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour}>{String(hour).padStart(2, "0")}:00</span>
          ))}
        </div>
        {columns.map((col) => (
          <div key={col.key} className="booking-timeline__column">
            {eventLanes(col.events, col.day).map(
              ({ row, top, height, lane, lanes }) => (
                <button
                  key={row.id}
                  className={`booking-event booking-event--${row.status}`}
                  style={{
                    top,
                    height,
                    left: `calc(${(lane / lanes) * 100}% + 3px)`,
                    width: `calc(${100 / lanes}% - 6px)`,
                  }}
                  onClick={() => onOpen(row)}
                  title={`${row.code} · ${row.reserved_by} · ${labTime(row.starts_at, language)}–${labTime(row.ends_at, language)} · ${t(`booking.${row.status}`)}`}
                >
                  <strong>
                    {view === "week" ? `${row.code} · ` : ""}
                    {row.reserved_by}
                  </strong>
                  <span>
                    {labTime(row.starts_at, language)}–
                    {labTime(row.ends_at, language)}
                  </span>
                  <small>{t(`booking.${row.status}`)}</small>
                </button>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
