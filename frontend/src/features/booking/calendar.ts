import type { CalendarRow } from "./types";

export type CalendarView = "day" | "week" | "month";
const DAY = 86400000;
export const LAB_TIMEZONE = "Asia/Shanghai";

/** ISO date and input values always refer to laboratory time, never browser time. */
export function labInput(value: string | Date): string {
  return new Date(new Date(value).getTime() + 8 * 3600000)
    .toISOString()
    .slice(0, 16);
}
export function labDate(value: string | Date = new Date()): string {
  return labInput(value).slice(0, 10);
}
export function labIso(input: string): string {
  return new Date(`${input}:00+08:00`).toISOString();
}
export function midnight(date: string): number {
  return new Date(`${date}T00:00:00+08:00`).getTime();
}
export function addDays(date: string, count: number): string {
  return labDate(new Date(midnight(date) + count * DAY));
}
export function rangeFor(
  date: string,
  view: CalendarView,
): { start: string; end: string; days: string[] } {
  let start = date,
    count = 1;
  if (view === "week") {
    const weekday = new Date(`${date}T12:00:00+08:00`).getUTCDay();
    start = addDays(date, -(weekday + 6) % 7);
    count = 7;
  } else if (view === "month") {
    const first = `${date.slice(0, 7)}-01`;
    const weekday = new Date(`${first}T12:00:00+08:00`).getUTCDay();
    start = addDays(first, -(weekday + 6) % 7);
    count = 42;
  }
  return {
    start: new Date(midnight(start)).toISOString(),
    end: new Date(midnight(addDays(start, count))).toISOString(),
    days: Array.from({ length: count }, (_, i) => addDays(start, i)),
  };
}
export function intersects(row: CalendarRow, date: string): boolean {
  return (
    Date.parse(row.starts_at) < midnight(addDays(date, 1)) &&
    Date.parse(row.ends_at) > midnight(date)
  );
}
export function labTime(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", {
    timeZone: LAB_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}
export function labStamp(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", {
    timeZone: LAB_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

/** Pack simultaneous equipment events into lanes in each day of the week. */
export function eventLanes(rows: CalendarRow[], date: string) {
  const sorted = rows
    .filter((row) => intersects(row, date))
    .sort(
      (a, b) =>
        Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id - b.id,
    );
  const ends: number[] = [];
  const result = sorted.map((row) => {
    const start = Math.max(Date.parse(row.starts_at), midnight(date));
    const end = Math.min(Date.parse(row.ends_at), midnight(addDays(date, 1)));
    let lane = ends.findIndex((value) => value <= start);
    if (lane < 0) lane = ends.length;
    ends[lane] = end;
    return {
      row,
      lane,
      top: ((start - midnight(date)) / 3600000) * 48,
      height: ((end - start) / 3600000) * 48,
    };
  });
  return result.map((item) => ({ ...item, lanes: Math.max(1, ends.length) }));
}
