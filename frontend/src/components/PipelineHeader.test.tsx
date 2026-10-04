import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PipelineHeader } from "./PipelineHeader";

const apiFetchMock = vi.hoisted(() => vi.fn());
vi.mock("../lib/api", () => ({ apiFetch: apiFetchMock }));

function directory(path: string) {
  if (path === "/api/experiments") return Promise.resolve([{ plan_status: "released" }, { plan_status: "draft" }]);
  if (path === "/api/fabrication-batches") return Promise.resolve([{ status: "in_progress" }, { status: "ready" }, { status: "completed" }]);
  if (path === "/api/results") return Promise.resolve([{}, {}, {}, {}]);
  return Promise.reject(new Error(`Unexpected API request: ${path}`));
}

function NavigateToResults() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/results")}>View results</button>;
}

function renderHeader(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PipelineHeader />
      <NavigateToResults />
    </MemoryRouter>,
  );
}

describe("PipelineHeader", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockImplementation(directory);
  });

  it("shows counts and lifecycle summaries from the accessible list endpoints", async () => {
    renderHeader();
    const plans = await screen.findByRole("link", { name: "Plans 2 1 released" });
    expect(plans).toHaveAttribute("href", "/experiments");
    expect(screen.getByRole("link", { name: "Fabrication 3 1 in progress" })).toHaveAttribute("href", "/fabrication-batches");
    expect(screen.getByRole("link", { name: "Characterization 4" })).toHaveAttribute("href", "/results");
    expect(screen.queryByText("Loading pipeline…")).not.toBeInTheDocument();
  });

  it.each([
    ["/experiments/1", "Plans"],
    ["/experiments/1/batches/2", "Fabrication"],
    ["/fabrication-batches", "Fabrication"],
    ["/results/3", "Characterization"],
    ["/analysis", "Characterization"],
    ["/experiments/1/upload", "Characterization"],
  ])("exposes exactly one current stage on %s", async (path, stage) => {
    renderHeader(path);
    const navigation = screen.getByRole("navigation", { name: "Workflow pipeline" });
    await within(navigation).findByRole("link", { name: "Characterization 4" });
    const current = within(navigation).getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(stage);
  });

  it.each(["/materials", "/campaigns/stability", "/campaigns/example/app", "/results-library"])(
    "does not fetch or render laboratory counts on %s",
    (path) => {
      renderHeader(path);
      expect(screen.queryByRole("navigation", { name: "Workflow pipeline" })).not.toBeInTheDocument();
      expect(apiFetchMock).not.toHaveBeenCalled();
    },
  );

  it("clears old counts after a failed navigation load and retries without leaving the page", async () => {
    renderHeader("/experiments");
    await screen.findByRole("link", { name: "Plans 2 1 released" });
    apiFetchMock.mockRejectedValue(new Error("Count service unavailable"));
    fireEvent.click(screen.getByRole("button", { name: "View results" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load pipeline counts. Count service unavailable");
    expect(screen.queryByText("Loading pipeline…")).not.toBeInTheDocument();
    expect(screen.queryByText("1 released")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plans —" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Characterization —" })).toHaveAttribute("aria-current", "page");

    apiFetchMock.mockImplementation(directory);
    fireEvent.click(screen.getByRole("button", { name: "Retry counts" }));
    await screen.findByRole("link", { name: "Plans 2 1 released" });
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Characterization 4" })).toHaveAttribute("aria-current", "page");
  });
});
