import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingManagementPage } from "./BookingManagementPage";
import { ReservationDialog } from "./BookingPage";
import { ManagementCreate } from "../features/booking/ManagementCreate";
import { UsageForm } from "../features/booking/UsageForm";
import { ApiError } from "../lib/api";
import { setLanguage } from "../i18n";
import type { Equipment, CalendarRow, Usage } from "../features/booking/types";
const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  pages: vi.fn(),
  users: vi.fn(),
  refresh: vi.fn(),
  role: "student",
  id: 2,
}));
vi.mock("../auth/session", () => ({
  useSession: () => ({
    user: { id: mocks.id, role: mocks.role },
    refresh: mocks.refresh,
  }),
}));
vi.mock("../features/booking/api", () => ({
  bookingApi: mocks.api,
  bookingPages: mocks.pages,
}));
vi.mock("../lib/api", async (original) => ({
  ...(await original<typeof import("../lib/api")>()),
  apiFetch: mocks.users,
}));
const eq: Equipment = {
  id: 1,
  code: "ALD",
  name: "Synthetic ALD",
  group_code: "vacuum",
  equipment_type: "ald",
  location: "GB-7",
  manager_id: 2,
  bookable: true,
  template: "ald",
  template_version: 1,
  units: { cycles: "cycle", temperature: "°C", pressure: "Torr" },
  description: "",
};
const baseUsage: Usage = {
  id: 1,
  reservation_id: 3,
  template: "ald",
  template_version: 1,
  units: eq.units,
  fields: {
    material: "Synthetic film",
    cycles: 3,
    initial_temperature: 80,
    chamber_pressure: 1.2,
  },
  notes: "",
  status: "draft",
  submitted_at: null,
  updated_at: "2026-10-23T01:00:00Z",
  updated_by_id: 1,
};
const row: CalendarRow = {
  id: 3,
  equipment_id: 1,
  code: "ALD",
  user_id: 1,
  reserved_by: "Synthetic Owner",
  kind: "booking",
  status: "planned",
  starts_at: new Date(Date.now() + 86400000).toISOString(),
  ends_at: new Date(Date.now() + 90000000).toISOString(),
  actual_start: null,
  actual_end: null,
};
beforeEach(() => {
  mocks.api.mockReset();
  mocks.pages.mockReset();
  mocks.refresh.mockClear();
  mocks.role = "student";
  mocks.id = 2;
  mocks.pages.mockResolvedValue([]);
  mocks.pages.mockImplementation(async (path: string) =>
    path === "workflow-access"
      ? [
          {
            user_id: 1,
            granted_at: "2026-10-23T01:00:00Z",
            revoked_at: null,
            granted_by_id: 2,
          },
        ]
      : [],
  );
  mocks.users.mockResolvedValue([
    {
      id: 1,
      username: "owner",
      display_name: "Synthetic Owner",
      is_active: true,
    },
    {
      id: 2,
      username: "manager",
      display_name: "Synthetic Manager",
      is_active: true,
    },
  ]);
  mocks.api.mockImplementation(async (path: string) =>
    path === "equipment"
      ? [eq, { ...eq, id: 2, code: "CVD", manager_id: 8 }]
      : path === "workflow-access"
        ? [
            {
              user_id: 1,
              granted_at: "2026-10-23T01:00:00Z",
              revoked_at: null,
              granted_by_id: 2,
            },
          ]
        : path.endsWith("/usage")
          ? baseUsage
          : { ...row, reason: "" },
  );
});
describe("scoped booking management", () => {
  it("shows only assigned equipment and withholds manager assignment and registration from an ordinary manager", async () => {
    render(
      <MemoryRouter>
        <BookingManagementPage />
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: "ALD · Equipment profile" });
    expect(
      screen.queryByRole("option", { name: "CVD · Synthetic ALD" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Equipment manager"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Equipment registration" }),
    ).not.toBeInTheDocument();
    expect(mocks.users).not.toHaveBeenCalled();
  });
  it("allows a system administrator to assign a manager and register new equipment", async () => {
    mocks.role = "administrator";
    render(
      <MemoryRouter>
        <BookingManagementPage />
      </MemoryRouter>,
    );
    fireEvent.change(await screen.findByLabelText("Equipment manager"), {
      target: { value: "1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save equipment profile" }),
    );
    await waitFor(() =>
      expect(mocks.api).toHaveBeenCalledWith(
        "equipment/1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({ manager_id: 1 }),
        }),
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Equipment registration" }),
    );
    fireEvent.change(await screen.findByLabelText("Equipment code"), {
      target: { value: "NEW-9" },
    });
    fireEvent.change(screen.getByLabelText("Equipment name"), {
      target: { value: "Registered spin coater" },
    });
    fireEvent.change(screen.getByLabelText("Equipment type"), {
      target: { value: "spin_coating" },
    });
    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "GB-20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Register equipment" }));
    await waitFor(() =>
      expect(mocks.api).toHaveBeenCalledWith(
        "equipment",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ code: "NEW-9" }),
        }),
      ),
    );
  });
  it("requires a reason to cancel another user and never allows writing their usage", async () => {
    render(
      <ReservationDialog
        row={row}
        equipment={eq}
        management
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    const button = await screen.findByRole("button", {
      name: "Cancel with reason",
    });
    expect(button).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Save draft" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Synthetic outage" },
    });
    fireEvent.click(button);
    await waitFor(() =>
      expect(mocks.api).toHaveBeenCalledWith("reservations/3/actions", {
        method: "POST",
        body: { action: "cancel", reason: "Synthetic outage" },
      }),
    );
  });
  it("sends a forced end without changing the owner’s ledger fields", async () => {
    mocks.api.mockImplementation(async (path: string) =>
      path.endsWith("/usage")
        ? baseUsage
        : { ...row, status: "in_use", reason: "" },
    );
    render(
      <ReservationDialog
        row={{ ...row, status: "in_use" }}
        equipment={eq}
        management
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    fireEvent.change(await screen.findByLabelText("Reason"), {
      target: { value: "Owner left equipment" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "End use on behalf of owner" }),
    );
    await waitFor(() =>
      expect(mocks.api).toHaveBeenCalledWith("reservations/3/actions", {
        method: "POST",
        body: { action: "force_end", reason: "Owner left equipment" },
      }),
    );
  });
  it("keeps the notice request key on retry and changes it if the form input changes", async () => {
    mocks.api.mockRejectedValue(new ApiError(503, "Synthetic failure"));
    render(
      <ManagementCreate
        equipmentId={1}
        kind="notice"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Notice body"), {
      target: { value: "Synthetic service notice" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish notice" }));
    await screen.findByRole("alert");
    const key = mocks.api.mock.calls[0][1].body.request_key;
    fireEvent.click(screen.getByRole("button", { name: "Publish notice" }));
    await waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(2));
    expect(mocks.api.mock.calls[1][1].body.request_key).toBe(key);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Publish notice" }),
      ).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText("Notice body"), {
      target: { value: "Changed synthetic notice" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish notice" }));
    await waitFor(() => expect(mocks.api).toHaveBeenCalledTimes(3));
    expect(mocks.api.mock.calls[2][1].body.request_key).not.toBe(key);
  });
  it("preserves six independent glovebox values through a language switch", () => {
    const save = vi.fn();
    render(
      <UsageForm
        usage={{
          ...baseUsage,
          template: "glovebox",
          fields: {},
          units: { h2o: "ppm", o2: "ppm", temperature: "°C" },
        }}
        busy={false}
        readOnly={false}
        inUse={false}
        completed
        onSave={save}
      />,
    );
    const labels = [
      "H₂O before use (ppm)",
      "H₂O after use (ppm)",
      "O₂ before use (ppm)",
      "O₂ after use (ppm)",
      "Temperature before use (°C)",
      "Temperature after use (°C)",
    ];
    labels.forEach((label, i) =>
      fireEvent.change(screen.getByLabelText(label), {
        target: { value: String(i) },
      }),
    );
    act(() => setLanguage("zh"));
    fireEvent.click(screen.getByRole("button", { name: "提交台账" }));
    expect(save).toHaveBeenCalledWith(
      {
        before_h2o: 0,
        after_h2o: 1,
        before_o2: 2,
        after_o2: 3,
        before_temperature: 4,
        after_temperature: 5,
      },
      "",
      "submit",
    );
  });
  it("submits repeatable evaporation layers with the saved units", () => {
    const save = vi.fn();
    render(
      <UsageForm
        usage={{
          ...baseUsage,
          template: "evaporation",
          fields: {},
          units: { pressure: "Torr", temperature: "°C", thickness: "Å" },
        }}
        busy={false}
        readOnly={false}
        inUse
        completed={false}
        onSave={save}
      />,
    );
    fireEvent.change(screen.getByLabelText("Deposition material"), {
      target: { value: "Ag" },
    });
    fireEvent.change(screen.getByLabelText("Thickness (Å)"), {
      target: { value: "800" },
    });
    fireEvent.change(screen.getByLabelText("Deposition vacuum (Torr)"), {
      target: { value: "0.0001" },
    });
    fireEvent.change(
      screen.getByLabelText("Initial process temperature (°C)"),
      { target: { value: "22" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit and end use" }));
    expect(save).toHaveBeenCalledWith(
      {
        layers: [{ material: "Ag", thickness: 800 }],
        vacuum: 0.0001,
        initial_temperature: 22,
      },
      "",
      "submit_and_end",
    );
  });
});
