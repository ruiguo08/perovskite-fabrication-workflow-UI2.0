import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisWorkbenchPage } from "./AnalysisWorkbenchPage";
import { batch, detail, experiment, result } from "../test/analysisFixtures";
import { analysisFixture } from "../features/campaign-analysis/campaignView.test";
import * as matrices from "../lib/conditionMatrix";
import type { ExperimentDetail } from "../types/api";
import { setLanguage } from "../i18n";

const apiFetchMock = vi.hoisted(() => vi.fn());
vi.mock("../lib/api", () => ({ apiFetch: apiFetchMock }));

const results = [result(1, 1), result(2, 1), result(3, 2)];
function directory(path: string) {
  if (path === "/api/results") return Promise.resolve(results);
  if (path === "/api/experiments") return Promise.resolve([experiment(1), experiment(2)]);
  if (path === "/api/fabrication-batches") return Promise.resolve([batch(100, 1), batch(200, 2)]);
  if (path === "/api/experiments/1") return Promise.resolve(detail(1));
  if (path === "/api/experiments/2") return Promise.resolve(detail(2));
  if (path.startsWith("/api/campaigns/") && path.includes("/analysis")) {
    return Promise.resolve(analysisFixture());
  }
  return Promise.reject(new Error(`Unexpected API request: ${path}`));
}
async function select(id: number) {
  fireEvent.click(await screen.findByRole("checkbox", { name: new RegExp(`scan-${id}\\.csv$`) }));
}
function findConditionTable() {
  return screen.findByRole("region", { name: "Condition comparison table" });
}

describe("AnalysisWorkbenchPage", () => {
  beforeEach(() => { vi.restoreAllMocks(); apiFetchMock.mockReset(); apiFetchMock.mockImplementation(directory); });

  it("fetches each selected experiment once in parallel and identifies all conditions", async () => {
    let resolveFirst!: (value: ExperimentDetail) => void;
    const pending = new Promise<ExperimentDetail>((resolve) => { resolveFirst = resolve; });
    apiFetchMock.mockImplementation((path: string) => path === "/api/experiments/1" ? pending : directory(path));
    render(<AnalysisWorkbenchPage />);
    await select(1); await select(2); await select(3);
    fireEvent.click(screen.getByRole("button", { name: "Compare conditions" }));
    expect(apiFetchMock.mock.calls.filter(([path]) => path === "/api/experiments/1")).toHaveLength(1);
    expect(apiFetchMock.mock.calls.filter(([path]) => path === "/api/experiments/2")).toHaveLength(1);
    expect(screen.getByText("Loading frozen conditions for the selected experiments…")).toBeInTheDocument();
    await act(async () => resolveFirst(detail(1)));
    const table = await findConditionTable();
    const headers = within(table).getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Parameter", "Plan-1C10 · Controlcontrol", "Plan-1C11 · Targettarget", "Plan-2C20 · Controlcontrol", "Plan-2C21 · Targettarget"]);
    const spin = within(table).getByText("Deposition › Spin step 1 › Speed").closest("tr")!;
    expect(within(spin).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["1000 rpm", "2000 rpm", "1000 rpm", "2000 rpm"]);
    expect(within(spin).getByText("◆ differs")).toBeInTheDocument();
    const requests = apiFetchMock.mock.calls.length;
    act(() => setLanguage("zh"));
    expect(within(table).getByText("沉积 › 旋涂步骤 1 › 转速")).toBeInTheDocument();
    expect(within(table).getByText("Plan-1C10 · Control对照")).toBeInTheDocument();
    expect(apiFetchMock.mock.calls).toHaveLength(requests);
    expect(within(table).getAllByText("1000 rpm").length).toBeGreaterThan(0);
  });

  it("discards a condition response after selection changes and retains the newer comparison", async () => {
    let resolveOld!: (value: ExperimentDetail) => void;
    const old = new Promise<ExperimentDetail>((resolve) => { resolveOld = resolve; });
    apiFetchMock.mockImplementation((path: string) => path === "/api/experiments/1" ? old : directory(path));
    render(<AnalysisWorkbenchPage />);
    await select(1);
    fireEvent.click(screen.getByRole("button", { name: "Compare conditions" }));
    await select(1); await select(3);
    fireEvent.click(screen.getByRole("button", { name: "Compare conditions" }));
    const table = await findConditionTable();
    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
    await act(async () => resolveOld(detail(1)));
    expect(within(table).queryByText("Plan-1")).not.toBeInTheDocument();
    expect(within(table).getAllByText("Plan-2", { exact: false })).toHaveLength(2);
  });

  it("clears outdated comparisons after selection changes and reports failed snapshot loads", async () => {
    render(<AnalysisWorkbenchPage />);
    await select(1);
    fireEvent.click(screen.getByRole("button", { name: "Compare conditions" }));
    await findConditionTable();
    await select(3);
    expect(screen.queryByRole("region", { name: "Condition comparison table" })).not.toBeInTheDocument();
    apiFetchMock.mockRejectedValue(new Error("Snapshot validation failed"));
    fireEvent.click(screen.getByRole("button", { name: "Compare conditions" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Snapshot validation failed");
    expect(screen.queryByText("Loading frozen conditions for the selected experiments…")).not.toBeInTheDocument();
  });

  it("does not build a late comparison after the workbench unmounts", async () => {
    let resolveLate!: (value: ExperimentDetail) => void;
    const pending = new Promise<ExperimentDetail>((resolve) => { resolveLate = resolve; });
    apiFetchMock.mockImplementation((path: string) => path === "/api/experiments/1" ? pending : directory(path));
    const build = vi.spyOn(matrices, "buildConditionMatrix");
    const view = render(<AnalysisWorkbenchPage />);
    await select(1);
    fireEvent.click(screen.getByRole("button", { name: "Compare conditions" }));
    view.unmount();
    await act(async () => resolveLate(detail(1)));
    expect(build).not.toHaveBeenCalled();
  });

  it("keeps the image on a direct endpoint and provides contextual rendering failure and retry", async () => {
    render(<AnalysisWorkbenchPage />);
    await select(1);
    expect(screen.getAllByText(/20.00% best PCE in batch/)).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Render overlay" }));
    const image = screen.getByRole("img", { name: /Cross-result J-V overlay: Plan-1\/B1: scan-1.csv/ });
    const original = image.getAttribute("src");
    expect(original).toMatch(/^\/api\/analysis\/jv-overlay\?result_id=1&format=svg&palette=science-tol&_=/);
    expect(screen.getByRole("status")).toHaveTextContent("Rendering overlay for Plan-1/B1: scan-1.csv");
    fireEvent.error(image);
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to render the overlay for Plan-1/B1: scan-1.csv");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Render overlay" }));
    const retry = screen.getByRole("img");
    expect(retry.getAttribute("src")).not.toEqual(original);
    fireEvent.load(retry);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await select(3);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("caps selection at twelve without silently replacing a selected result", async () => {
    apiFetchMock.mockImplementation((path: string) => path === "/api/results" ? Promise.resolve(Array.from({ length: 13 }, (_, index) => result(index + 1, 1))) : directory(path));
    render(<AnalysisWorkbenchPage />);
    for (let id = 1; id <= 12; id += 1) await select(id);
    expect(screen.getByRole("checkbox", { name: /scan-13\.csv$/ })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /scan-1\.csv$/ })).toBeChecked();
    await select(1);
    expect(screen.getByRole("checkbox", { name: /scan-13\.csv$/ })).toBeEnabled();
  });
});
