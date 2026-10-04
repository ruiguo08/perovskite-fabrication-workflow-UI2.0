import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignWorkspacePage } from "./CampaignWorkspacePage";

const apiFetchMock = vi.hoisted(() => vi.fn());
vi.mock("../lib/api", () => ({ apiFetch: apiFetchMock }));

const campaigns = [
  { id: 1, code: "stability", display_name: "Stability series", status: "active" },
  { id: 2, code: "interface", display_name: "Interface series", status: "active" },
];
const experiments = [
  { id: 1, campaign_id: "stability", experiment_code: "Plan-A", status: "suggested", plan_status: "draft", updated_at: "2026-10-03T08:00:00Z" },
  { id: 2, campaign_id: "interface", experiment_code: "Plan-B", status: "suggested", plan_status: "released", updated_at: "2026-10-03T08:00:00Z" },
];
const batches = [
  { id: 10, experiment_id: 1, experiment_code: "Plan-A", batch_code: "B01", status: "ready" },
  { id: 20, experiment_id: 2, experiment_code: "Plan-B", batch_code: "B02", status: "in_progress" },
];
const results = [
  { id: 101, experiment_id: 1, experiment_code: "Plan-A", filename: "assigned.csv", group_assignment: "saved" },
  { id: 102, experiment_id: 1, experiment_code: "Plan-A", filename: "unassigned.csv", group_assignment: "" },
  { id: 201, experiment_id: 2, experiment_code: "Plan-B", filename: "foreign.csv", group_assignment: "" },
];

function directory(path: string) {
  if (path === "/api/campaigns") return Promise.resolve(campaigns);
  if (path === "/api/experiments") return Promise.resolve(experiments);
  if (path === "/api/fabrication-batches") return Promise.resolve(batches);
  if (path === "/api/results") return Promise.resolve(results);
  return Promise.reject(new Error(`Unexpected API request: ${path}`));
}

function SwitchCampaign() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/campaigns/interface")}>Switch campaign</button>;
}

function renderPage(code = "stability") {
  return render(
    <MemoryRouter initialEntries={[`/campaigns/${code}`]}>
      <SwitchCampaign />
      <Routes>
        <Route path="/campaigns/:code" element={<CampaignWorkspacePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CampaignWorkspacePage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockImplementation(directory);
  });

  it("groups only the campaign's records and exposes each status as visible text", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "Stability series" });
    const rail = screen.getByRole("navigation", { name: "Campaign records" });
    expect(within(rail).getByText("PLANNING · 1")).toBeInTheDocument();
    expect(within(rail).getByText("FABRICATION · 1")).toBeInTheDocument();
    expect(within(rail).getByText("CHARACTERIZATION · 2")).toBeInTheDocument();
    expect(within(rail).getByRole("button", { name: "Plan-A draft" })).toHaveAttribute("aria-pressed", "false");
    expect(within(rail).getByRole("button", { name: "B01 ready" })).toBeInTheDocument();
    expect(within(rail).getByRole("button", { name: "assigned.csv assigned" })).toBeInTheDocument();
    expect(within(rail).getByRole("button", { name: "unassigned.csv unassigned" })).toBeInTheDocument();
    expect(within(rail).queryByText("Plan-B")).not.toBeInTheDocument();
    expect(within(rail).queryByText("foreign.csv")).not.toBeInTheDocument();
  });

  it("keeps focus in the rail while announcing selection and linking to the selected record", async () => {
    renderPage();
    const batch = await screen.findByRole("button", { name: "B01 ready" });
    batch.focus();
    fireEvent.click(batch);
    expect(batch).toHaveFocus();
    expect(batch).toHaveAttribute("aria-pressed", "true");
    expect(batch).toHaveAttribute("aria-controls", "campaign-record-detail");
    const detail = screen.getByRole("region", { name: "Record details" });
    expect(detail).toHaveAttribute("id", "campaign-record-detail");
    expect(within(detail).getByRole("status")).toHaveTextContent("Campaign › Fabrication › B01");
    expect(within(detail).getByRole("heading", { name: "B01" })).toBeInTheDocument();
    expect(within(detail).getByRole("link", { name: "Open run sheet" })).toHaveAttribute("href", "/experiments/1/batches/10");

    const result = screen.getByRole("button", { name: "assigned.csv assigned" });
    result.focus();
    fireEvent.click(result);
    expect(result).toHaveFocus();
    expect(result).toHaveAttribute("aria-pressed", "true");
    expect(batch).toHaveAttribute("aria-pressed", "false");
    expect(within(detail).getByRole("link", { name: "Open result" })).toHaveAttribute("href", "/results/101");
  });

  it("clears the selected detail when navigating to another campaign", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "B01 ready" }));
    expect(screen.getByRole("link", { name: "Open run sheet" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Switch campaign" }));
    expect(await screen.findByRole("heading", { name: "Interface series" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plan-B released" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("link", { name: "Open run sheet" })).not.toBeInTheDocument();
    expect(screen.getByText("Select a record from the left rail")).toBeInTheDocument();
  });

  it("reports an unavailable campaign without exposing unrelated records", async () => {
    renderPage("missing");
    expect(await screen.findByRole("alert")).toHaveTextContent('No campaign with code "missing".');
    expect(screen.queryByRole("navigation", { name: "Campaign records" })).not.toBeInTheDocument();
  });

  it("reports API failure instead of staying in a loading state", async () => {
    apiFetchMock.mockRejectedValue(new Error("Campaign service unavailable"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Campaign service unavailable");
    expect(screen.queryByText("Loading campaign workspace…")).not.toBeInTheDocument();
  });
});
