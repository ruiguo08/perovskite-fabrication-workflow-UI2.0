import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appTheme } from "../theme/theme";
import type { FabricationBatchListItem, ResultListItem } from "../types/api";
import { PortfolioBoard } from "./PortfolioBoard";

const RECENT = "2026-10-04T11:00:00Z";
const OLD = "2026-10-01T12:00:00Z";

function experiment(id: number, planStatus: string | null, status = "suggested") {
  return { id, experiment_code: `EXP-${id}`, status, plan_status: planStatus, updated_at: RECENT };
}

function batch(id: number, status: string, overrides: Partial<FabricationBatchListItem> = {}): FabricationBatchListItem {
  return {
    id, experiment_id: 1, experiment_code: "EXP-1", batch_number: id, batch_code: `B-${id}`,
    status, condition_set_hash: "test-hash", notes: "", created_by_id: 1,
    created_at: RECENT, updated_at: RECENT, started_at: null, completed_at: null,
    cancelled_at: null, best_pce: null, best_jsc: null, ...overrides,
  };
}

function result(id: number, batchId: number, overrides: Partial<ResultListItem> = {}): ResultListItem {
  return {
    id, experiment_id: 1, experiment_code: "EXP-1", fabrication_batch_id: batchId,
    batch_code: `B-${batchId}`, filename: `measurement-${id}.csv`, content_type: "text/csv",
    size_bytes: 100, sha256: "test-hash", group_assignment: "", metrics: {},
    analysis_schema_version: 6, created_at: RECENT, ...overrides,
  };
}

function renderBoard(
  experiments: ReturnType<typeof experiment>[] = [],
  batches: FabricationBatchListItem[] = [],
  results: ResultListItem[] = [],
) {
  return render(<ThemeProvider theme={appTheme}><MemoryRouter>
    <PortfolioBoard experiments={experiments} batches={batches} results={results} />
  </MemoryRouter></ThemeProvider>);
}

function record(id: string) {
  return document.querySelector<HTMLElement>(`[data-portfolio-record="${id}"]`)!;
}

describe("PortfolioBoard", () => {
  beforeEach(() => { vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-04T12:00:00Z")); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("keeps draft, submitted and legacy planned records visible and excludes terminal plans", () => {
    renderBoard([
      experiment(1, "draft"), experiment(2, "pending_approval"),
      experiment(3, null, "suggested"), experiment(4, null, "planned"),
      experiment(5, "approved"), experiment(6, "released"),
      experiment(7, "draft", "cancelled"), experiment(8, "completed", "completed"),
      experiment(9, "cancelled"),
    ]);
    const planning = screen.getByRole("region", { name: "Planning" });
    expect(within(planning).getAllByRole("link")).toHaveLength(4);
    for (const id of [1, 2, 3, 4]) {
      expect(within(planning).getByRole("link", { name: new RegExp(`EXP-${id}`) }))
        .toHaveAttribute("href", `/experiments/${id}`);
    }
    const approved = screen.getByRole("region", { name: "Approved" });
    expect(within(approved).getAllByRole("link")).toHaveLength(2);
    expect(within(approved).getByText("Awaiting release")).toBeInTheDocument();
    expect(within(approved).getByText("Awaiting batch")).toBeInTheDocument();
    for (const id of [7, 8, 9]) expect(record(`experiment-${id}`)).toBeNull();
  });

  it("covers every batch lifecycle state and retains completed batches awaiting their first measurement", () => {
    renderBoard([experiment(1, "in_progress", "running")], [
      batch(1, "draft"), batch(2, "ready"), batch(3, "in_progress"),
      batch(4, "completed", { completed_at: OLD }), batch(5, "completed"),
      batch(6, "cancelled"),
    ], [result(1, 5)]);
    const fabrication = screen.getByRole("region", { name: "Fabrication" });
    expect(within(fabrication).getAllByRole("link")).toHaveLength(3);
    for (const id of [1, 2, 3]) {
      expect(record(`batch-${id}`)).toHaveAttribute("href", `/experiments/1/batches/${id}`);
    }
    const characterization = screen.getByRole("region", { name: "Characterization" });
    expect(within(characterization).getAllByRole("link")).toHaveLength(2);
    expect(record("batch-4")).toHaveAttribute("href", "/experiments/1/batches/4");
    expect(within(record("batch-4")).getByText("awaiting measurements")).toBeInTheDocument();
    expect(within(record("batch-4")).getByText("Over 24 h")).toBeInTheDocument();
    expect(record("batch-5")).toBeNull();
    expect(record("batch-6")).toBeNull();
    expect(record("result-1")).toHaveAttribute("href", "/results/1");
    expect(screen.getByText(/5 records in the pipeline/)).toBeInTheDocument();
  });

  it("labels a measured PCE with its batch scope and never substitutes another batch or experiment champion", () => {
    const measuredExperiment = { ...experiment(1, "in_progress"), best_pce: 30 };
    renderBoard([measuredExperiment], [
      batch(1, "in_progress", { best_pce: 12.345 }),
      batch(2, "completed", { best_pce: null }),
      batch(3, "completed", { experiment_id: 9, best_pce: 24 }),
    ], [result(1, 1), result(2, 2), result(3, 99), result(4, 3)]);
    expect(within(record("batch-1")).getByText("12.35% batch best forward PCE")).toBeInTheDocument();
    expect(within(record("result-1")).getByText("12.35% batch best forward PCE")).toBeInTheDocument();
    for (const id of [2, 3, 4]) {
      expect(within(record(`result-${id}`)).queryByText(/PCE/)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/30.00%/)).not.toBeInTheDocument();
  });

  it("shows a valid zero PCE and omits nonfinite measurements", () => {
    renderBoard([], [batch(1, "ready", { best_pce: 0 }), batch(2, "ready", { best_pce: Infinity })]);
    expect(within(record("batch-1")).getByText("0.00% batch best forward PCE")).toBeInTheDocument();
    expect(within(record("batch-2")).queryByText(/PCE/)).not.toBeInTheDocument();
  });

  it("uses started and completed timestamps for aging and handles invalid dates without an aging warning", () => {
    renderBoard([], [
      batch(1, "in_progress", { started_at: OLD }),
      batch(2, "completed", { completed_at: OLD }),
      batch(3, "ready", { updated_at: "not-a-date" }),
    ]);
    expect(within(record("batch-1")).getByText("started 3 d ago")).toBeInTheDocument();
    expect(within(record("batch-2")).getByText("completed 3 d ago")).toBeInTheDocument();
    expect(within(record("batch-3")).getByText("Time unavailable")).toBeInTheDocument();
    expect(within(record("batch-3")).queryByText("Over 24 h")).not.toBeInTheDocument();
  });

  it("combines status text with domain dots and uses Apple surfaces, link blue and negative tracking", () => {
    const { container } = renderBoard([experiment(1, "approved"), experiment(2, "released")], [batch(1, "draft")]);
    const dots = [record("experiment-1"), record("experiment-2"), record("batch-1")]
      .map((card) => card.querySelector<HTMLElement>("[aria-hidden]"));
    expect(dots.every((dot) => dot?.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(dots.map((dot) => getComputedStyle(dot!).backgroundColor))
      .toEqual(["rgb(30, 122, 77)", "rgb(22, 138, 157)", "rgb(104, 82, 184)"]);
    expect(within(record("experiment-1")).getByText("approved")).toBeInTheDocument();
    expect(within(record("experiment-2")).getByText("released")).toBeInTheDocument();
    expect(within(record("batch-1")).getByText("draft")).toBeInTheDocument();
    for (const card of container.querySelectorAll<HTMLElement>("[data-portfolio-record]")) {
      const style = getComputedStyle(card);
      expect(style.borderRadius).toBe("8px");
      expect(["", "none"]).toContain(style.boxShadow);
      expect(["", "0px"]).toContain(style.borderLeftWidth);
      expect(getComputedStyle(card.firstElementChild!).color).toBe("rgb(0, 102, 204)");
    }
    for (const column of container.querySelectorAll<HTMLElement>("[data-portfolio-column]")) {
      expect(getComputedStyle(column).borderRadius).toBe("12px");
      expect(getComputedStyle(column).backgroundColor).toBe("rgb(245, 245, 247)");
    }
    for (const text of container.querySelectorAll(".MuiTypography-root")) {
      expect(Number.parseFloat(getComputedStyle(text).letterSpacing)).toBeLessThan(0);
    }
    const rules = Array.from(document.styleSheets).flatMap((sheet) =>
      Array.from(sheet.cssRules).map((rule) => rule.cssText),
    );
    const cardClass = Array.from(record("batch-1").classList).find((value) => value.startsWith("css-"));
    const hover = rules.find((rule) => rule.startsWith(`.${cardClass}:hover`));
    expect(hover).toContain("background-color: #fafafc");
    expect(hover).not.toContain("box-shadow");
    const focus = rules.find((rule) => rule.startsWith(`.${cardClass}:focus-visible`));
    expect(focus).toContain("outline: 2px solid #0071e3");
  });
});
