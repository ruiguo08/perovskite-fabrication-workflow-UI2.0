import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../components/Toast";
import { LayerPresetsPage } from "./LayerPresetsPage";

const apiFetchMock = vi.hoisted(() => vi.fn());
const sessionState = vi.hoisted(() => ({
  role: "student" as "student" | "instructor" | "administrator",
}));

vi.mock("../lib/api", () => ({ apiFetch: apiFetchMock }));
vi.mock("../auth/session", () => ({
  useSession: () => ({
    user: { id: 2, username: "preset-user", display_name: "Preset User", role: sessionState.role, csrf_available: true },
  }),
}));

const layer = {
  layer_type: "sam",
  role: "htl",
  name: "2PACz",
  preset_id: "sam_spin_v1",
  solution: {
    formulation_type: "weighed_solids",
    stock_dispersion: "",
    stock_volume_ml: null,
    solids: [{ chemical: "2PACz", weight_mg: 1 }],
    solvents: [{ solvent: "ethanol", volume_ml: 1 }],
  },
  process: {
    method: "spin_coating",
    spin_steps: [{ rpm: 3000, seconds: 30, acceleration_rpm_per_s: 1000 }],
    anneal_steps: [{ temperature_c: 100, seconds: 600 }],
  },
};

const sharedPreset = {
  id: 31,
  preset_key: "sam_spin_v1",
  name: "Shared SAM",
  status: "active",
  scope: "shared",
  layer,
  deposition_process: null,
  current_revision_number: 1,
  current_version_id: 41,
  canonical_hash: "a".repeat(64),
  created_at: "2026-08-01T08:00:00Z",
  updated_at: "2026-08-01T08:00:00Z",
};

const personalPreset = {
  ...sharedPreset,
  id: 32,
  preset_key: "personal-preset-version:42",
  name: "My SAM",
  scope: "personal",
  current_version_id: 42,
  canonical_hash: "b".repeat(64),
};

const inactivePreset = {
  ...personalPreset,
  id: 36,
  name: "Old SAM",
  status: "inactive",
  current_version_id: 46,
};

const metalPreset = {
  ...sharedPreset,
  id: 38,
  name: "Metal cathode",
  current_version_id: 48,
  layer: {
    ...layer,
    layer_type: "ag",
    role: "top_electrode",
    name: "Ag",
    process: { method: "thermal_evaporation", thickness_nm: 60, rate_angstrom_per_s: 0.5 },
  },
};

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <LayerPresetsPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

async function openDetails(name: string) {
  const card = await screen.findByRole("article", { name });
  fireEvent.click(within(card).getByRole("button", { name: "View details" }));
}

describe("LayerPresetsPage", () => {
  beforeEach(() => {
    sessionState.role = "student";
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue([sharedPreset, personalPreset]);
  });

  it("renders browse cards with summaries, completeness notes, and role-appropriate actions", async () => {
    renderPage();

    const sharedCard = await screen.findByRole("article", { name: "Shared SAM" });
    expect(within(sharedCard).getByText("HTL")).toBeInTheDocument();
    expect(within(sharedCard).getByText("SAM")).toBeInTheDocument();
    expect(within(sharedCard).getByText("shared")).toBeInTheDocument();
    expect(within(sharedCard).getByText("Weighed solids")).toBeInTheDocument();
    expect(within(sharedCard).getByText(/1 spin stage · 1 annealing stage/)).toBeInTheDocument();
    expect(within(sharedCard).getByRole("button", { name: "View details" })).toBeInTheDocument();
    // A student cannot edit shared presets.
    expect(within(sharedCard).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    const personalCard = screen.getByRole("article", { name: "My SAM" });
    expect(within(personalCard).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("flags an incomplete preset with one plain-language warning", async () => {
    apiFetchMock.mockResolvedValue([{
      ...personalPreset,
      id: 37,
      name: "Partial NiOx",
      current_version_id: 47,
      layer: { ...layer, solution: null, process: null },
    }]);
    renderPage();

    const card = await screen.findByRole("article", { name: "Partial NiOx" });
    expect(within(card).getByText(/Partial template — missing: Layer process/i)).toBeInTheDocument();
    expect(within(card).queryByText(/layer\.0\.process/)).not.toBeInTheDocument();
  });

  it("keeps filter options stable from the full catalog while results narrow", async () => {
    apiFetchMock.mockResolvedValue([sharedPreset, personalPreset, metalPreset]);
    renderPage();

    await screen.findByText("Shared SAM");
    fireEvent.change(screen.getByLabelText("Layer type"), { target: { value: "sam" } });
    expect(screen.queryByText("Metal cathode")).not.toBeInTheDocument();

    const layerTypeSelect = screen.getByLabelText("Layer type");
    expect(within(layerTypeSelect.closest("select") as HTMLElement).getByText("Ag")).toBeInTheDocument();
    fireEvent.change(layerTypeSelect, { target: { value: "ag" } });
    expect(await screen.findByText("Metal cathode")).toBeInTheDocument();
  });

  it("opens a detail view with process order, versions, and collapsed provenance", async () => {
    renderPage();

    await openDetails("My SAM");
    const detailRegion = screen.getByRole("article", { name: "My SAM" });
    expect(within(detailRegion).getByRole("button", { name: "Edit preset" })).toBeInTheDocument();
    expect(within(detailRegion).getAllByText("Spin coating").length).toBeGreaterThan(0);
    expect(within(detailRegion).getAllByText("Stage 1").length).toBeGreaterThanOrEqual(1);
    expect(within(detailRegion).getByText(/3000 rpm · 30 s · 1000 rpm\/s/)).toBeInTheDocument();
    expect(within(detailRegion).getByText(/100 °C · 600 s/)).toBeInTheDocument();
    expect(within(detailRegion).getByText("Compare revisions")).toBeInTheDocument();
    expect(within(detailRegion).getByText("Version history")).toBeInTheDocument();

    fireEvent.click(within(detailRegion).getByText("Canonical hash, source key, and schema"));
    expect(within(detailRegion).getByText("personal-preset-version:42")).toBeInTheDocument();

    // Back returns to the browse view.
    fireEvent.click(within(detailRegion).getByRole("button", { name: /Back to library/i }));
    expect(await screen.findByRole("article", { name: "Shared SAM" })).toBeInTheDocument();
  });

  it("shows a perovskite detail with the ordered vacuum program", async () => {
    apiFetchMock.mockResolvedValue([{
      ...sharedPreset,
      id: 39,
      name: "Perovskite standard",
      layer: { ...layer, layer_type: "perovskite", role: "perovskite", name: "Perovskite", process: null },
      deposition_process: {
        method: "spin_coating_vcd",
        spin_steps: [{ rpm: 1000, seconds: 10, acceleration_rpm_per_s: 200 }],
        vcd_stages: [{ valve: "VV02", pressure_pa: 900, seconds: 60 }],
        gas_backfill_stages: [{ gas: "N2", flow_sccm: 20, target_pressure_pa: 500, hold_seconds: 5 }],
        vcd_step_sequence: ["vcd_stage1", "gas_backfill_stage1"],
        anneal_steps: [{ temperature_c: 100, seconds: 600 }],
      },
      current_version_id: 49,
    }]);
    renderPage();

    await openDetails("Perovskite standard");
    const detail = screen.getByRole("article", { name: "Perovskite standard" });
    expect(await within(detail).findByText(/Evacuate \(stage 1\)/)).toBeInTheDocument();
    expect(within(detail).getByText(/VV02 · 900 Pa · 60 s/)).toBeInTheDocument();
    expect(within(detail).getByText(/Gas backfill \(stage 2\)/)).toBeInTheDocument();
    expect(within(detail).getByText(/N2 · 20 sccm → 500 Pa · hold 5 s/)).toBeInTheDocument();
    expect(within(detail).getByText("Template complete")).toBeInTheDocument();
    expect(within(detail).queryByText(/Sputtering/)).not.toBeInTheDocument();
  });

  it("creates a preset from scratch in the workspace and shows the saved record", async () => {
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/layer-presets" && options?.method === "POST") {
        return Promise.resolve({ ...personalPreset, id: 34, name: "My first NiOx" });
      }
      return Promise.resolve([]);
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "New preset" }));
    const workspace = screen.getByRole("region", { name: "New preset" });
    fireEvent.change(within(workspace).getByLabelText(/^Layer type/), { target: { value: "niox" } });
    fireEvent.change(within(workspace).getByLabelText(/^Preset name/), { target: { value: "My first NiOx" } });
    expect(within(workspace).getByLabelText(/^Layer name/)).toHaveValue("NiOx");

    // A non-perovskite preset may keep solution and process empty.
    fireEvent.click(within(workspace).getByRole("button", { name: "Create personal preset" }));

    await waitFor(() => {
      const call = apiFetchMock.mock.calls.find(
        (c) => c[0] === "/api/layer-presets" && (c[1] as { method?: string })?.method === "POST",
      );
      expect((call?.[1] as { body?: { layer?: unknown } })?.body).toEqual({
        name: "My first NiOx",
        layer: { layer_type: "niox", role: "htl", name: "NiOx", preset_id: null, solution: null, process: null },
        deposition_process: null,
        scope: "personal",
      });
    });
    // The saved record becomes visible: detail view of the new preset.
    expect(await screen.findByRole("article", { name: "My first NiOx" })).toBeInTheDocument();
  });

  it("cancels the workspace without sending any request and keeps filter context", async () => {
    apiFetchMock.mockResolvedValue([sharedPreset, personalPreset]);
    renderPage();

    await screen.findByText("Shared SAM");
    fireEvent.change(screen.getByLabelText("Search presets"), { target: { value: "Shared" } });
    fireEvent.click(screen.getByRole("button", { name: "New preset" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Back on the browse view with the search context preserved.
    expect(await screen.findByText("Shared SAM")).toBeInTheDocument();
    expect(screen.queryByText("My SAM")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search presets")).toHaveValue("Shared");
    expect(apiFetchMock).not.toHaveBeenCalledWith("/api/layer-presets", expect.objectContaining({ method: "POST" }));
  });

  it("copies a snapshot into an independent preset; filters do not change the source", async () => {
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/layer-presets" && options?.method === "POST") {
        return Promise.resolve({ ...personalPreset, id: 33, name: "My optimized SAM" });
      }
      return Promise.resolve([sharedPreset, personalPreset]);
    });
    renderPage();

    await screen.findByText("Shared SAM");
    fireEvent.change(screen.getByLabelText("Search presets"), { target: { value: "Shared" } });
    fireEvent.click(screen.getByRole("button", { name: "New preset" }));
    const workspace = screen.getByRole("region", { name: "New preset" });
    fireEvent.click(within(workspace).getByRole("button", { name: "Copy existing preset" }));
    // The copy source list is the complete visible catalog, not the filter.
    fireEvent.change(within(workspace).getByLabelText(/^Source preset/), { target: { value: "32" } });
    fireEvent.change(within(workspace).getByLabelText(/^New preset name/), { target: { value: "My optimized SAM" } });
    fireEvent.click(within(workspace).getByRole("button", { name: "Create personal preset" }));

    expect(await screen.findByRole("article", { name: "My optimized SAM" })).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledWith("/api/layer-presets", {
      method: "POST",
      body: { name: "My optimized SAM", layer, deposition_process: null, scope: "personal" },
    });
  });

  it("excludes a deactivated preset from the copy catalog instead of switching", async () => {
    sessionState.role = "instructor";
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/layer-presets?promotable=true") return Promise.resolve([]);
      if (path === "/api/layer-presets/31" && options?.method === "DELETE") return Promise.resolve(undefined);
      return Promise.resolve([sharedPreset, metalPreset]);
    });
    renderPage();

    await openDetails("Shared SAM");
    const detail = screen.getByRole("article", { name: "Shared SAM" });
    fireEvent.click(within(detail).getByRole("button", { name: "Deactivate Shared SAM" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Deactivate preset" }));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/api/layer-presets/31", { method: "DELETE" }));

    // The copy catalog refreshes: the deactivated preset is not offered.
    fireEvent.click(screen.getByRole("button", { name: /Back to library/i }));
    fireEvent.click(await screen.findByRole("button", { name: "New preset" }));
    const workspace = screen.getByRole("region", { name: "New preset" });
    fireEvent.click(within(workspace).getByRole("button", { name: "Copy existing preset" }));
    const sourceSelect = within(workspace).getByLabelText(/^Source preset/);
    expect(sourceSelect).toHaveValue("38");
    expect(within(sourceSelect.closest("select") as HTMLElement).queryByText("Shared SAM · HTL · shared")).not.toBeInTheDocument();
    expect(within(sourceSelect.closest("select") as HTMLElement).getByText("Metal cathode · Top Electrode · shared")).toBeInTheDocument();
  });

  it("edits a preset as a new revision with preview, draft restore, and retry on failure", async () => {
    window.localStorage.clear();
    let failing = true;
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/layer-presets/32" && options?.method === "PUT") {
        return failing
          ? Promise.reject(new Error("network down"))
          : Promise.resolve({ ...personalPreset, name: "Renamed SAM", current_revision_number: 2, current_version_id: 62 });
      }
      return Promise.resolve([sharedPreset, personalPreset]);
    });
    renderPage();

    const card = await screen.findByRole("article", { name: "My SAM" });
    fireEvent.click(within(card).getByRole("button", { name: "Edit" }));
    const workspace = screen.getByRole("region", { name: "Edit My SAM" });
    expect(within(workspace).getByText(/Current revision r1 — saving creates revision r2/i)).toBeInTheDocument();
    expect(within(workspace).getByText(/saves revision/)).toBeInTheDocument();

    fireEvent.change(await within(workspace).findByLabelText(/^Preset name/), { target: { value: "Renamed SAM" } });
    fireEvent.click(within(workspace).getByRole("button", { name: "Save new revision" }));
    expect(await within(workspace).findByText("network down")).toBeInTheDocument();
    // The draft survives the failed save for retry.
    expect(window.localStorage.getItem("perovskite-bo:preset-32-draft:2")).toContain("Renamed SAM");

    failing = false;
    fireEvent.click(within(workspace).getByRole("button", { name: "Save new revision" }));
    // The saved record is shown in the detail view with the new revision.
    const detail = await screen.findByRole("article", { name: "Renamed SAM" });
    expect(within(detail).getAllByText(/r2/).length).toBeGreaterThan(0);
    await waitFor(() => expect(window.localStorage.getItem("perovskite-bo:preset-32-draft:2")).toBeNull());
    window.localStorage.clear();
  });

  it("shows promotion failures from the browse view", async () => {
    sessionState.role = "instructor";
    const studentPreset = {
      id: 77,
      preset_key: "student-sam",
      name: "Student SAM",
      status: "active",
      scope: "personal",
      layer,
      deposition_process: null,
      current_revision_number: 1,
      current_version_id: 771,
      canonical_hash: "c".repeat(64),
      created_at: "2026-09-01T08:00:00Z",
      updated_at: "2026-09-01T08:00:00Z",
    };
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/layer-presets?promotable=true") {
        return Promise.resolve([studentPreset]);
      }
      if (path === "/api/layer-presets/77/promote" && options?.method === "POST") {
        return Promise.reject(new Error("a shared layer preset named 'Shared SAM' already exists"));
      }
      return Promise.resolve([sharedPreset]);
    });
    renderPage();

    const card = await screen.findByRole("article", { name: "Student SAM" });
    fireEvent.click(within(card).getByRole("button", { name: "Promote to shared" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Promote to shared" }));

    expect(
      await screen.findByText(/a shared layer preset named 'Shared SAM' already exists/i),
    ).toBeInTheDocument();
  });

  it("shows deactivate failures on the detail surface", async () => {
    sessionState.role = "instructor";
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/layer-presets?promotable=true") return Promise.resolve([]);
      if (path === "/api/layer-presets/31" && options?.method === "DELETE") return Promise.reject(new Error("deactivate failed"));
      return Promise.resolve([sharedPreset]);
    });
    renderPage();

    await openDetails("Shared SAM");
    const detail = screen.getByRole("article", { name: "Shared SAM" });
    fireEvent.click(within(detail).getByRole("button", { name: "Deactivate Shared SAM" }));
    fireEvent.click(screen.getByRole("button", { name: "Deactivate preset" }));

    expect(await within(detail).findByText("deactivate failed")).toBeInTheDocument();
  });

  it("keeps the inactive status visible in browse and filters inactive records", async () => {
    apiFetchMock.mockResolvedValue([sharedPreset, personalPreset, inactivePreset]);
    renderPage();

    await screen.findByText("Shared SAM");
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "inactive" } });
    expect(screen.getByText("Old SAM")).toBeInTheDocument();
    expect(screen.queryByText("Shared SAM")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 3 records"));
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("3 of 3 records"));
  });

  it("searches recorded materials and readable process labels (P2-4)", async () => {
    renderPage();

    // A recorded solvent name matches even though the preset is "Shared SAM".
    fireEvent.change(await screen.findByLabelText("Search presets"), { target: { value: "ethanol" } });
    expect(screen.getByText("Shared SAM")).toBeInTheDocument();
    expect(screen.getByText("My SAM")).toBeInTheDocument();
    expect(screen.getByText("2 of 2 records"));

    // A readable process label matches case-insensitively with spaces.
    fireEvent.change(screen.getByLabelText("Search presets"), { target: { value: "Spin Coating" } });
    expect(screen.getByText("Shared SAM")).toBeInTheDocument();
    expect(screen.getByText("2 of 2 records"));

    // No match is a distinct state and does not disturb the copy source or
    // the filter candidates.
    fireEvent.change(screen.getByLabelText("Search presets"), { target: { value: "zzz-no-match" } });
    expect(screen.getByText("0 of 2 records")).toBeInTheDocument();
    const layerTypeSelect = screen.getByLabelText("Layer type");
    expect(within(layerTypeSelect.closest("select") as HTMLElement).getByText("SAM")).toBeInTheDocument();
  });

  it("reads the complete formulation in the detail view without editing (P2-2)", async () => {
    renderPage();

    await openDetails("My SAM");
    const detail = screen.getByRole("article", { name: "My SAM" });
    expect(within(detail).getByText("Solid 1")).toBeInTheDocument();
    expect(within(detail).getByText("2PACz — 1 mg")).toBeInTheDocument();
    expect(within(detail).getByText("Solvent 1")).toBeInTheDocument();
    expect(within(detail).getByText("ethanol — 1 mL")).toBeInTheDocument();

    // Missing values state themselves instead of being derived (no formula
    // solution on the shared fixture's partial sibling — the full fixture
    // has formula/CAS; here the formulation itself is absent on Old SAM is
    // not used: Shared SAM has a full solution, so check the "Not recorded"
    // markers via the partial template case instead).
    fireEvent.click(screen.getByRole("button", { name: /Back to library/i }));
    await openDetails("Shared SAM");
    const partialDetail = screen.getByRole("article", { name: "Shared SAM" });
    expect(within(partialDetail).getByText("Formulation")).toBeInTheDocument();
    expect(within(partialDetail).getAllByText("Weighed solids").length).toBeGreaterThanOrEqual(1);
  });

  it("reads a diluted dispersion with stock name and volume in detail (P2-2)", async () => {
    apiFetchMock.mockResolvedValue([{
      ...personalPreset,
      id: 40,
      name: "Passivation dilution",
      layer: {
        ...layer,
        solution: {
          formulation_type: "diluted_dispersion",
          stock_dispersion: "NiOx nanoparticle ink",
          stock_volume_ml: 3,
          solids: [],
          solvents: [],
        },
      },
      current_version_id: 50,
    }]);
    renderPage();

    await openDetails("Passivation dilution");
    const detail = screen.getByRole("article", { name: "Passivation dilution" });
    expect(within(detail).getByText("Diluted dispersion")).toBeInTheDocument();
    expect(within(detail).getByText("NiOx nanoparticle ink")).toBeInTheDocument();
    expect(within(detail).getByText("3 mL")).toBeInTheDocument();
  });

  it("keeps the per-role action matrix on preset details (P2-2)", async () => {
    // Student: own personal preset stays editable and deactivatable, but
    // promotion is never offered.
    const ownPersonal = { ...personalPreset, id: 51, name: "My recipe", current_version_id: 61 };
    apiFetchMock.mockResolvedValue([ownPersonal]);
    const studentRender = renderPage();
    await openDetails("My recipe");
    let detail = screen.getByRole("article", { name: "My recipe" });
    expect(within(detail).getByRole("button", { name: "Edit preset" })).toBeInTheDocument();
    expect(within(detail).getByRole("button", { name: "Deactivate My recipe" })).toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: "Promote to shared" })).not.toBeInTheDocument();
    studentRender.unmount();

    // Student: shared presets grant none of the write actions.
    apiFetchMock.mockResolvedValue([sharedPreset]);
    const sharedStudent = renderPage();
    await openDetails("Shared SAM");
    detail = screen.getByRole("article", { name: "Shared SAM" });
    expect(within(detail).queryByRole("button", { name: "Edit preset" })).not.toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: "Deactivate Shared SAM" })).not.toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: "Promote to shared" })).not.toBeInTheDocument();
    sharedStudent.unmount();

    // Staff: own personal presets keep promote + edit + deactivate; shared
    // presets keep edit + deactivate but are never promotable.
    sessionState.role = "administrator";
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/api/layer-presets?promotable=true") return Promise.resolve([]);
      return Promise.resolve([personalPreset, sharedPreset]);
    });
    renderPage();
    await openDetails("My SAM");
    detail = screen.getByRole("article", { name: "My SAM" });
    expect(within(detail).getByRole("button", { name: "Edit preset" })).toBeInTheDocument();
    expect(within(detail).getByRole("button", { name: "Deactivate My SAM" })).toBeInTheDocument();
    expect(within(detail).getByRole("button", { name: "Promote to shared" })).toBeInTheDocument();
    fireEvent.click(within(detail).getByRole("button", { name: /Back to library/i }));
    await openDetails("Shared SAM");
    detail = screen.getByRole("article", { name: "Shared SAM" });
    expect(within(detail).getByRole("button", { name: "Edit preset" })).toBeInTheDocument();
    expect(within(detail).getByRole("button", { name: "Deactivate Shared SAM" })).toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: "Promote to shared" })).not.toBeInTheDocument();
  });

  it("reads a diluted dispersion with stock, solvents, and volumes in detail (P2-3)", async () => {
    apiFetchMock.mockResolvedValue([{
      ...personalPreset,
      id: 40,
      name: "Passivation dilution",
      layer: {
        ...layer,
        solution: {
          formulation_type: "diluted_dispersion",
          stock_dispersion: "NiOx nanoparticle ink",
          stock_volume_ml: 3,
          solids: [],
          solvents: [
            { solvent: "ethanol", volume_ml: 7 },
            { solvent: "IPA", volume_ml: 2 },
          ],
        },
      },
      current_version_id: 50,
    }]);
    renderPage();

    await openDetails("Passivation dilution");
    const detail = screen.getByRole("article", { name: "Passivation dilution" });
    expect(within(detail).getByText("Diluted dispersion")).toBeInTheDocument();
    expect(within(detail).getByText("NiOx nanoparticle ink")).toBeInTheDocument();
    expect(within(detail).getByText("3 mL")).toBeInTheDocument();
    // Every recorded dilution solvent is readable — none is silently skipped.
    expect(within(detail).getByText("Solvent 1")).toBeInTheDocument();
    expect(within(detail).getByText("ethanol — 7 mL")).toBeInTheDocument();
    expect(within(detail).getByText("Solvent 2")).toBeInTheDocument();
    expect(within(detail).getByText("IPA — 2 mL")).toBeInTheDocument();
    // The stock fact appears exactly once (no duplicate keys).
    expect(within(detail).getAllByText("NiOx nanoparticle ink")).toHaveLength(1);
    expect(within(detail).getAllByText("Stock dispersion")).toHaveLength(1);
  });

  it("opens a promotable student preset read-only and promotes it (P2-1)", async () => {
    sessionState.role = "instructor";
    const studentPreset = {
      id: 77,
      preset_key: "student-sam",
      name: "Student SAM",
      status: "active",
      scope: "personal",
      layer,
      deposition_process: null,
      current_revision_number: 1,
      current_version_id: 771,
      canonical_hash: "c".repeat(64),
      created_at: "2026-09-01T08:00:00Z",
      updated_at: "2026-09-01T08:00:00Z",
    };
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/layer-presets?promotable=true") {
        return Promise.resolve([studentPreset]);
      }
      if (path === "/api/layer-presets/77/promote" && options?.method === "POST") {
        return Promise.resolve({ ...studentPreset, scope: "shared", preset_key: "shared:77" });
      }
      return Promise.resolve([sharedPreset]);
    });
    renderPage();

    // The student's record appears only in the staff promotion list, not as
    // an editable personal/shared card in the regular groups.
    await screen.findByText("Shared SAM");
    const promotedCard = screen.getByRole("article", { name: "Student SAM" });
    fireEvent.click(within(promotedCard).getByRole("button", { name: "View details" }));

    // The promotable detail is a read-only snapshot with an authorized Promote.
    const detail = screen.getByRole("article", { name: "Student SAM" });
    expect(within(detail).getByRole("button", { name: "Promote to shared" })).toBeInTheDocument();
    expect(within(detail).getByText(/Version history and comparison become available after the preset is promoted/i)).toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: "Edit preset" })).not.toBeInTheDocument();
    expect(within(detail).queryByRole("button", { name: "Deactivate Student SAM" })).not.toBeInTheDocument();
    expect(within(detail).queryByText("Version history")).not.toBeInTheDocument();

    // No unauthorized version request was made.
    expect(apiFetchMock).not.toHaveBeenCalledWith("/api/layer-presets/77/versions");

    // Promotion succeeds and switches to the standard shared detail.
    fireEvent.click(within(detail).getByRole("button", { name: "Promote to shared" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Promote to shared" }));
    const promotedDetail = await screen.findByRole("article", { name: "Student SAM" });
    expect(within(promotedDetail).getByRole("button", { name: "Edit preset" })).toBeInTheDocument();
    expect(within(promotedDetail).getByText("Version history")).toBeInTheDocument();
    expect(within(promotedDetail).getAllByText("shared").length).toBeGreaterThan(0);
  });
});
