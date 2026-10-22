import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingPage, ReservationDialog } from "./BookingPage";
import { setLanguage } from "../i18n";
import type { CalendarRow, Equipment, Usage } from "../features/booking/types";
const mocks = vi.hoisted(() => ({ api: vi.fn(), pages: vi.fn() }));
vi.mock("../features/booking/api", () => ({
  bookingApi: mocks.api,
  bookingPages: mocks.pages,
}));
vi.mock("../auth/session", () => ({
  useSession: () => ({
    user: { id: 1, role: "student", display_name: "Synthetic Owner" },
  }),
}));
const eq: Equipment = {
  id: 1,
  code: "ALD",
  name: "ALD",
  group_code: "vacuum",
  equipment_type: "ald",
  location: "GB-7",
  manager_id: 2,
  bookable: true,
  template: "ald",
  template_version: 1,
  units: { temperature: "°C", pressure: "Pa", cycles: "cycle" },
  description: "",
};
const row: CalendarRow = {
  id: 3,
  equipment_id: 1,
  code: "ALD",
  user_id: 1,
  reserved_by: "Synthetic Owner",
  kind: "booking",
  status: "in_use",
  starts_at: "2026-10-23T01:00:00Z",
  ends_at: "2026-10-23T02:00:00Z",
  actual_start: "2026-10-23T01:00:00Z",
  actual_end: null,
};
const usage: Usage = {
  id: 1,
  reservation_id: 3,
  template: "ald",
  template_version: 1,
  units: eq.units,
  fields: {},
  notes: "",
  status: "draft",
  submitted_at: null,
  updated_at: "2026-10-23T01:00:00Z",
  updated_by_id: 1,
};
beforeEach(() => {
  mocks.api.mockReset();
  mocks.pages.mockReset();
  mocks.api.mockImplementation(async (path: string) =>
    path === "equipment"
      ? [eq]
      : path.endsWith("/usage")
        ? usage
        : { ...row, reason: "" },
  );
  mocks.pages.mockResolvedValue([]);
});
describe("booking workspace", () => {
  it("preserves unsaved fields while changing the application language and posts Shanghai timestamps", async () => {
    render(<BookingPage />);
    const create = await screen.findByRole("button", { name: "New booking" });
    await waitFor(() => expect(create).toBeEnabled());
    fireEvent.click(create);
    const starts = screen.getByLabelText("Start (Shanghai time)");
    fireEvent.change(starts, { target: { value: "2026-12-01T09:00" } });
    fireEvent.change(screen.getByLabelText("End (Shanghai time)"), {
      target: { value: "2026-12-01T10:00" },
    });
    act(() => setLanguage("zh"));
    expect(screen.getByLabelText("开始（上海时间）")).toHaveValue(
      "2026-12-01T09:00",
    );
    fireEvent.click(screen.getByRole("button", { name: "预约设备" }));
    await waitFor(() =>
      expect(mocks.api).toHaveBeenCalledWith(
        "reservations",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            starts_at: "2026-12-01T01:00:00.000Z",
            ends_at: "2026-12-01T02:00:00.000Z",
          }),
        }),
      ),
    );
  });
  it("keeps equipment selection when switching calendar views", async () => {
    render(<BookingPage />);
    const box = await screen.findByRole("checkbox", { name: "ALD ALD" });
    fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    expect(box).not.toBeChecked();
    expect(
      screen.getByText("Select equipment to view its calendar."),
    ).toBeInTheDocument();
  });
  it("ends use with a draft through the API and refreshes the completed record", async () => {
    const saved = vi.fn();
    render(
      <ReservationDialog
        row={row}
        equipment={eq}
        onClose={vi.fn()}
        onSaved={saved}
      />,
    );
    fireEvent.change(await screen.findByLabelText("Deposition material"), {
      target: { value: "Synthetic film" },
    });
    mocks.api.mockImplementation(
      async (path: string, options?: { method: string }) =>
        options
          ? {}
          : path.endsWith("/usage")
            ? usage
            : { ...row, status: "completed", reason: "" },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "End use, fill in later" }),
    );
    await waitFor(() =>
      expect(mocks.api).toHaveBeenCalledWith("reservations/3/actions", {
        method: "POST",
        body: {
          action: "end",
          fields: { material: "Synthetic film" },
          notes: "",
        },
      }),
    );
    expect(
      await screen.findByRole("button", { name: "Submit usage record" }),
    ).toBeInTheDocument();
    expect(saved).toHaveBeenCalled();
  });
  it("does not request another user’s private detail or usage", () => {
    render(
      <ReservationDialog
        row={{ ...row, user_id: 4 }}
        equipment={eq}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(mocks.api).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Save draft" }),
    ).not.toBeInTheDocument();
  });
});
