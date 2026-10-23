import { describe, it, expect } from "vitest";
import {
  addDays,
  eventLanes,
  intersects,
  labDate,
  labInput,
  labIso,
  rangeFor,
} from "./calendar";
import type { CalendarRow } from "./types";

const row = (id: number, start: string, end: string): CalendarRow => ({
  id,
  equipment_id: 1,
  code: "ALD",
  user_id: 1,
  reserved_by: "Synthetic user",
  kind: "booking",
  status: "planned",
  starts_at: start,
  ends_at: end,
  actual_start: null,
  actual_end: null,
});
describe("laboratory calendar", () => {
  it("keeps adjacent short bookings proportional instead of visually overlapping", () => {
    const packed = eventLanes(
      [
        row(1, "2026-10-23T09:00+08:00", "2026-10-23T09:15+08:00"),
        row(2, "2026-10-23T09:15+08:00", "2026-10-23T09:30+08:00"),
      ],
      "2026-10-23",
    );
    expect(packed[0].height).toBe(12);
    expect(packed[0].top + packed[0].height).toBe(packed[1].top);
    expect(packed.map((item) => item.lane)).toEqual([0, 0]);
  });
  it("converts timestamps independently of the browser timezone", () => {
    expect(labDate("2026-10-23T19:30:00Z")).toBe("2026-10-24");
    expect(labInput("2026-10-23T19:30:00Z")).toBe("2026-10-24T03:30");
    expect(labIso("2026-10-24T03:30")).toBe("2026-10-23T19:30:00.000Z");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("uses Monday weeks and a complete six-week month grid", () => {
    expect(rangeFor("2026-10-25", "week").days).toEqual([
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(rangeFor("2026-11-01", "month").days).toHaveLength(42);
    expect(rangeFor("2026-11-01", "month").days[0]).toBe("2026-10-26");
  });
  it("clips multi-day events and excludes an adjacent midnight end", () => {
    const item = row(
      1,
      "2026-10-23T22:00:00+08:00",
      "2026-10-24T00:00:00+08:00",
    );
    expect(intersects(item, "2026-10-23")).toBe(true);
    expect(intersects(item, "2026-10-24")).toBe(false);
    expect(eventLanes([item], "2026-10-23")[0]).toMatchObject({
      top: 1056,
      height: 96,
    });
  });
  it("keeps simultaneous equipment events visible in separate lanes", () => {
    const packed = eventLanes(
      [
        row(1, "2026-10-23T09:00+08:00", "2026-10-23T10:00+08:00"),
        row(2, "2026-10-23T09:30+08:00", "2026-10-23T10:30+08:00"),
        row(3, "2026-10-23T10:00+08:00", "2026-10-23T11:00+08:00"),
      ],
      "2026-10-23",
    );
    expect(packed.map((item) => item.lane)).toEqual([0, 1, 0]);
    expect(packed.every((item) => item.lanes === 2)).toBe(true);
  });
});
