import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignAnalysisPanel } from "./CampaignAnalysisPanel";
import { analysisFixture } from "./campaignView.test";
import type { CampaignAnalysis, RepresentativeRule } from "./types";

const apiFetchMock = vi.hoisted(() => vi.fn());
vi.mock("../../lib/api", () => ({ apiFetch: apiFetchMock }));

const experimentCampaignById = new Map<number, string | null>([
  [1, "review"],
  [2, "other"],
]);
const batches = [
  {
    id: 100, experiment_id: 1, experiment_code: "Plan-1", batch_number: 1, batch_code: "B1",
    status: "completed", condition_set_hash: "", notes: "", created_by_id: 1,
    created_at: "2026-10-03T08:00:00Z", updated_at: "2026-10-03T08:00:00Z",
    started_at: null, completed_at: null, cancelled_at: null, best_pce: 20, best_jsc: 22,
  },
];

/** Respond with a payload whose scope echoes the requested rule so tests
 * can tell responses apart. */
function respondWithEchoedScope() {
  apiFetchMock.mockImplementation((path: string) => {
    const rule = (/representative=(\w+)/.exec(path)?.[1] ?? "latest") as RepresentativeRule;
    const payload = analysisFixture();
    payload.scope.representative = rule;
    return Promise.resolve(payload);
  });
}

function renderPanel() {
  return render(
    <CampaignAnalysisPanel
      campaignIds={["review", "other"]}
      experimentCampaignById={experimentCampaignById}
      batches={batches}
    />,
  );
}

async function chooseOption(label: string, option: string) {
  fireEvent.mouseDown(screen.getByLabelText(label));
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

describe("CampaignAnalysisPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiFetchMock.mockReset();
    respondWithEchoedScope();
  });

  it("loads the first campaign with the latest rule and renders labels and links", async () => {
    renderPanel();
    const summary = await screen.findByRole("region", { name: "Campaign summary table" });
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/campaigns/review/analysis?representative=latest",
    );
    expect(within(summary).getAllByText("forward").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Plan-1\/B1 · C10 \(control\)/).length).toBeGreaterThan(0);
    expect(screen.getByText("Plan-1/B1 · C10 (control): 1/2 measured (50%)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Source result 7" })).toHaveAttribute(
      "href",
      "/app/results/7",
    );
    expect(screen.getByText("missing-direction")).toBeInTheDocument();
  });

  it("refetches when the representative rule or batch filter changes", async () => {
    renderPanel();
    await screen.findByRole("region", { name: "Campaign summary table" });
    await chooseOption("Representative", "mean across uploads");
    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenLastCalledWith(
        "/api/campaigns/review/analysis?representative=mean",
      ),
    );
    await screen.findByText(/representative mean/);
    await chooseOption("Batch", "B1");
    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenLastCalledWith(
        "/api/campaigns/review/analysis?representative=mean&fabrication_batch_id=100",
      ),
    );
  });

  it("discards a stale response after the filter changes", async () => {
    let resolveOld!: (value: CampaignAnalysis) => void;
    apiFetchMock.mockImplementationOnce(
      () =>
        new Promise<CampaignAnalysis>((resolve) => {
          resolveOld = resolve;
        }),
    );
    renderPanel();
    await screen.findByText("Loading campaign analysis…");
    await chooseOption("Representative", "mean across uploads");
    const table = await screen.findByRole("region", { name: "Campaign summary table" });
    expect(screen.getByText(/representative mean/)).toBeInTheDocument();
    await act(async () => {
      const stale = analysisFixture();
      stale.experiment_count = 99;
      stale.scope.representative = "latest";
      resolveOld(stale);
    });
    // The stale payload must never replace the newer one.
    expect(screen.queryByText(/99 experiment\(s\)/)).not.toBeInTheDocument();
    expect(within(table).getAllByText("forward").length).toBeGreaterThan(0);
    expect(screen.getByText(/representative mean/)).toBeInTheDocument();
  });

  it("reports load failures and recovers on the next filter change", async () => {
    apiFetchMock.mockRejectedValueOnce(new Error("Snapshot validation failed"));
    renderPanel();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load the campaign analysis: Snapshot validation failed",
    );
    await chooseOption("Representative", "mean across uploads");
    await screen.findByRole("region", { name: "Campaign summary table" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an explanatory empty state without campaigns", () => {
    render(
      <CampaignAnalysisPanel
        campaignIds={[]}
        experimentCampaignById={new Map()}
        batches={[]}
      />,
    );
    expect(
      screen.getByText(/Campaign comparison needs an experiment in a campaign/),
    ).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("marks actual and planned origins in the process table and zero control change", async () => {
    const payload = analysisFixture({
      comparisons: [
        {
          batch_id: 100,
          control_batch_condition_id: 11,
          target_batch_condition_id: 12,
          direction: "forward",
          metric: "pce",
          control_mean: 0,
          target_mean: 12,
          difference: 12,
          percent_change: null,
          n_control_units: 1,
          n_target_units: 1,
          inference_note: "descriptive only",
        },
      ],
    });
    apiFetchMock.mockResolvedValue(payload);
    renderPanel();
    const table = await screen.findByRole("region", { name: "Actual process comparison table" });
    // Each variant column shows the effective value and the frozen plan
    // reference side by side.
    expect(within(table).getAllByText("Actual / effective").length).toBe(2);
    expect(within(table).getAllByText("Planned (frozen)").length).toBe(2);
    expect(within(table).getAllByText("actual").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("planned").length).toBeGreaterThan(0);
    // A not-executed step stays empty in the effective column (the plan
    // value must NOT be restored there) while the plan column shows it.
    expect(within(table).getAllByText("5000 rpm").length).toBe(1);
    expect(screen.getAllByText("◆ deviates from plan").length).toBeGreaterThan(0);
    expect(screen.getByText("— (control mean is zero)")).toBeInTheDocument();
  });
});
