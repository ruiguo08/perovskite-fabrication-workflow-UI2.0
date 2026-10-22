import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { setLanguage } from "../i18n";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../components/Toast";
import { MaterialsPage } from "./MaterialsPage";

const apiFetchMock = vi.hoisted(() => vi.fn());
const sessionState = vi.hoisted(() => ({
  role: "student" as "student" | "instructor" | "administrator",
}));

vi.mock("../lib/api", () => ({ apiFetch: apiFetchMock }));
vi.mock("../auth/session", () => ({
  useSession: () => ({
    user: {
      id: 2,
      username: "catalog-user",
      display_name: "Catalog User",
      role: sessionState.role,
      csrf_available: true,
    },
  }),
}));

const activeMaterial = {
  id: 11,
  category: "substrate",
  name: "FTO glass",
  formula: "SnO₂:F",
  cas_number: "",
  specification: { sheet_resistance: "7 ohm/sq", thickness_mm: 2.2 },
  status: "active",
  products: [
    {
      id: 21,
      vendor: "GreatCell Solar",
      catalog_number: "TEC7",
      specification: { thickness_mm: 2.2 },
      status: "active",
      created_at: "2026-08-01T08:00:00Z",
      updated_at: "2026-08-01T08:00:00Z",
    },
  ],
  created_at: "2026-08-01T08:00:00Z",
  updated_at: "2026-08-02T08:00:00Z",
};

const pendingMaterial = {
  ...activeMaterial,
  id: 12,
  category: "chemical",
  name: "Phenethylammonium iodide",
  formula: "C₈H₁₂IN",
  cas_number: "104510-00-8",
  specification: { purity: "99.5%" },
  status: "pending",
  products: [],
};

function renderPage() {
  return render(
    <ToastProvider>
      <MaterialsPage />
    </ToastProvider>,
  );
}

describe("MaterialsPage", () => {
  it("updates category, status and plural counts without translating material data", async () => {
    apiFetchMock.mockResolvedValue([{ ...activeMaterial, products: [...activeMaterial.products, ...activeMaterial.products] }, pendingMaterial]);
    renderPage();
    const card = await screen.findByRole("article", { name: "FTO glass" });
    expect(within(card).getByText(/2 supplier products/)).toBeInTheDocument();
    act(() => setLanguage("zh"));
    expect(screen.getByRole("option", { name: "化学品与试剂" })).toHaveValue("chemical");
    expect(within(card).getByText(/2 个供应商产品/).textContent).not.toContain("产品s");
    expect(screen.getByRole("option", { name: "可用" })).toHaveValue("active");
    expect(screen.getByRole("article", { name: "Phenethylammonium iodide" })).toHaveTextContent("待审核");
    expect(screen.getByText("Phenethylammonium iodide")).toBeInTheDocument();
    expect(within(card).getByText("7 ohm/sq")).toBeInTheDocument();
  });

  beforeEach(() => {
    sessionState.role = "student";
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue([activeMaterial, pendingMaterial]);
  });

  it("renders browse cards with category-aware summaries and product counts", async () => {
    renderPage();

    const card = await screen.findByRole("article", { name: "FTO glass" });
    expect(within(card).getByText("Substrate")).toBeInTheDocument();
    expect(within(card).getByText("SnO₂:F")).toBeInTheDocument();
    expect(within(card).getByText("Sheet Resistance")).toBeInTheDocument();
    expect(within(card).getByText("7 ohm/sq")).toBeInTheDocument();
    expect(within(card).getByText(/1 supplier product/)).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "View details" })).toBeInTheDocument();
    // Students never see manager actions.
    expect(within(card).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("distinguishes an empty catalog from empty search results", async () => {
    apiFetchMock.mockResolvedValue([]);
    const first = renderPage();
    expect(await screen.findByText("No materials have been recorded.")).toBeInTheDocument();
    first.unmount();

    apiFetchMock.mockResolvedValue([activeMaterial]);
    renderPage();
    await screen.findByText("FTO glass");
    fireEvent.change(screen.getByLabelText("Search materials"), { target: { value: "no-such-material" } });
    expect(screen.getByText("No materials match the current filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("1 of 1 records")).toBeInTheDocument();
  });

  it("searches names, formula, CAS, and specification text with stable filter options", async () => {
    renderPage();

    await screen.findByText("FTO glass");
    fireEvent.change(screen.getByLabelText("Search materials"), { target: { value: "104510-00-8" } });
    expect(screen.getByText("Phenethylammonium iodide")).toBeInTheDocument();
    expect(screen.queryByText("FTO glass")).not.toBeInTheDocument();
    expect(screen.getByText("1 of 2 records")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search materials"), { target: { value: "ohm/sq" } });
    expect(await screen.findByText("FTO glass")).toBeInTheDocument();
    expect(screen.queryByText("Phenethylammonium iodide")).not.toBeInTheDocument();

    // Category options come from the full authorized catalog.
    const categorySelect = screen.getByLabelText("Category");
    expect(within(categorySelect).getByText("Chemicals and reagents")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 records")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("2 of 2 records")).toBeInTheDocument();
  });

  it("shows the detail surface with identity, specifications, and supplier products", async () => {
    renderPage();

    const card = await screen.findByRole("article", { name: "FTO glass" });
    fireEvent.click(within(card).getByRole("button", { name: "View details" }));

    const detail = screen.getByRole("article", { name: "FTO glass" });
    expect(within(detail).getByText("Identity")).toBeInTheDocument();
    expect(within(detail).getByText("Specification")).toBeInTheDocument();
    expect(within(detail).getByText("Supplier products")).toBeInTheDocument();
    expect(within(detail).getByText("GreatCell Solar")).toBeInTheDocument();
    expect(within(detail).getByText(/TEC7/)).toBeInTheDocument();
    // Raw technical data stays collapsed by default.
    expect(within(detail).getByText("Raw specification (JSON)")).toBeInTheDocument();

    fireEvent.click(within(detail).getByRole("button", { name: /Back to directory/i }));
    // Back returns to the browse view with the catalog visible.
    expect(await screen.findByRole("article", { name: "FTO glass" })).toBeInTheDocument();
  });

  it("lets a student submit a material for review from the workspace", async () => {
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/materials" && options?.method === "POST") {
        return Promise.resolve({
          ...pendingMaterial,
          id: 13,
          name: "Bathocuproine",
          formula: "C₂₆H₂₀N₂",
        });
      }
      return Promise.resolve([activeMaterial, pendingMaterial]);
    });
    renderPage();

    await screen.findByText("FTO glass");
    fireEvent.click(screen.getByRole("button", { name: "New material" }));
    const workspace = screen.getByRole("region", { name: "New material" });
    fireEvent.change(within(workspace).getByLabelText(/^Material category/), { target: { value: "chemical" } });
    fireEvent.change(within(workspace).getByLabelText(/^Material name/), { target: { value: "Bathocuproine" } });
    fireEvent.change(within(workspace).getByLabelText("Formula"), { target: { value: "C₂₆H₂₀N₂" } });

    // Structured specification rows: add one numeric row.
    fireEvent.click(within(workspace).getByRole("button", { name: "Add specification row" }));
    fireEvent.change(within(workspace).getByLabelText("Specification key new-field-1"), { target: { value: "molecular_weight" } });
    fireEvent.change(within(workspace).getByLabelText("Value type for molecular_weight"), { target: { value: "number" } });
    fireEvent.change(within(workspace).getByLabelText("Value for molecular_weight"), { target: { value: "483.36" } });

    fireEvent.click(within(workspace).getByRole("button", { name: "Submit material for review" }));

    await waitFor(() => {
      const call = apiFetchMock.mock.calls.find(
        (c) => c[0] === "/api/materials" && (c[1] as { method?: string })?.method === "POST",
      );
      const body = (call?.[1] as { body?: { specification?: Record<string, unknown> } })?.body;
      expect(body?.specification).toEqual({ molecular_weight: 483.36 });
      expect(typeof body?.specification?.molecular_weight).toBe("number");
    });
    // The saved record is shown afterwards.
    expect(await screen.findByRole("article", { name: "Bathocuproine" })).toBeInTheDocument();
  });

  it("preserves unknown and complex specification fields through an edit", async () => {
    sessionState.role = "administrator";
    const materialWithComplex = {
      ...activeMaterial,
      specification: {
        sheet_resistance: "7 ohm/sq",
        vendor_notes: { contact: "sales@example.com" },
        treatments: ["UV-ozone", "plasma"],
      },
    };
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/materials/11" && options?.method === "PATCH") {
        return Promise.resolve({ ...materialWithComplex, name: "FTO glass 2.2mm" });
      }
      return Promise.resolve([materialWithComplex]);
    });
    renderPage();

    const card = await screen.findByRole("article", { name: "FTO glass" });
    fireEvent.click(within(card).getByRole("button", { name: "Edit" }));
    const workspace = screen.getByRole("region", { name: "Edit FTO glass" });
    // Complex fields are kept, not shown as rows.
    expect(within(workspace).getByText(/Kept without changes/)).toBeInTheDocument();
    expect(within(workspace).queryByLabelText("Value for treatments")).not.toBeInTheDocument();

    fireEvent.change(within(workspace).getByLabelText(/^Material name/), { target: { value: "FTO glass 2.2mm" } });
    fireEvent.click(within(workspace).getByRole("button", { name: "Save material" }));

    await waitFor(() => {
      const call = apiFetchMock.mock.calls.find(
        (c) => c[0] === "/api/materials/11" && (c[1] as { method?: string })?.method === "PATCH",
      );
      const body = (call?.[1] as { body?: { specification?: Record<string, unknown>; name?: string } })?.body;
      expect(body?.name).toBe("FTO glass 2.2mm");
      expect(body?.specification?.vendor_notes).toEqual({ contact: "sales@example.com" });
      expect(body?.specification?.treatments).toEqual(["UV-ozone", "plasma"]);
      expect(body?.specification?.sheet_resistance).toBe("7 ohm/sq");
    });
    expect(await screen.findByRole("article", { name: "FTO glass 2.2mm" })).toBeInTheDocument();
  });

  it("cancels the workspace without any write request and restores filter context", async () => {
    renderPage();

    await screen.findByText("FTO glass");
    fireEvent.change(screen.getByLabelText("Search materials"), { target: { value: "FTO" } });
    fireEvent.click(screen.getByRole("button", { name: "New material" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("FTO glass")).toBeInTheDocument();
    expect(screen.queryByText("Phenethylammonium iodide")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search materials")).toHaveValue("FTO");
    expect(apiFetchMock).not.toHaveBeenCalledWith("/api/materials", expect.objectContaining({ method: "POST" }));
  });

  it.each(["instructor", "administrator"] as const)(
    "gives %s accounts edit and review controls",
    async (role) => {
      sessionState.role = role;
      apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
        if (path === "/api/materials/12" && options?.method === "PATCH") {
          return Promise.resolve({ ...pendingMaterial, status: "active" });
        }
        return Promise.resolve([activeMaterial, pendingMaterial]);
      });
      renderPage();

      const pendingCard = await screen.findByRole("article", { name: "Phenethylammonium iodide" });
      expect(within(pendingCard).getByRole("button", { name: "Edit" })).toBeInTheDocument();
      fireEvent.click(within(pendingCard).getByRole("button", { name: "Edit" }));

      const workspace = screen.getByRole("region", { name: "Edit Phenethylammonium iodide" });
      expect(within(workspace).getByLabelText("Material category (fixed)")).toHaveValue("Chemical");
      fireEvent.change(within(workspace).getByLabelText(/^Record status/), { target: { value: "active" } });
      fireEvent.click(within(workspace).getByRole("button", { name: "Save material" }));

      await waitFor(() => {
        expect(apiFetchMock).toHaveBeenCalledWith("/api/materials/12", {
          method: "PATCH",
          body: expect.objectContaining({ status: "active" }),
        });
      });
      // The saved record is shown with its activated state.
      const detail = await screen.findByRole("article", { name: "Phenethylammonium iodide" });
      expect(within(detail).getAllByText("active").length).toBeGreaterThan(0);
    },
  );

  it("lets a student propose a supplier product inside the material detail", async () => {
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/materials/11/products" && options?.method === "POST") {
        return Promise.resolve({
          ...activeMaterial,
          products: [
            ...activeMaterial.products,
            {
              ...activeMaterial.products[0],
              id: 22,
              vendor: "Ossila",
              catalog_number: "S111",
              status: "pending",
            },
          ],
        });
      }
      return Promise.resolve([activeMaterial]);
    });
    renderPage();

    const card = await screen.findByRole("article", { name: "FTO glass" });
    fireEvent.click(within(card).getByRole("button", { name: "View details" }));
    const detail = screen.getByRole("article", { name: "FTO glass" });
    fireEvent.click(within(detail).getByText("Propose supplier product"));
    fireEvent.change(within(detail).getByLabelText(/^New vendor for FTO glass/), { target: { value: "Ossila" } });
    fireEvent.change(within(detail).getByLabelText(/^New catalog number for FTO glass/), { target: { value: "S111" } });
    fireEvent.click(within(detail).getByRole("button", { name: "Submit product for review" }));

    expect(await within(detail).findByText("Ossila")).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledWith("/api/materials/11/products", {
      method: "POST",
      body: { vendor: "Ossila", catalog_number: "S111", specification: {} },
    });
  });

  it("blocks an invalid advanced JSON in the edit workspace and recovers (P1-1)", async () => {
    sessionState.role = "administrator";
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/materials/11" && options?.method === "PATCH") {
        return Promise.resolve({ ...activeMaterial, name: "FTO glass updated" });
      }
      return Promise.resolve([activeMaterial]);
    });
    renderPage();

    const card = await screen.findByRole("article", { name: "FTO glass" });
    fireEvent.click(within(card).getByRole("button", { name: "Edit" }));
    const workspace = screen.getByRole("region", { name: "Edit FTO glass" });
    fireEvent.click(within(workspace).getByRole("button", { name: /Advanced specification editor \(JSON\)/ }));
    const advanced = within(workspace).getByLabelText("Advanced specification (JSON)");

    // Invalid JSON disables the form save and Apply; no write request.
    fireEvent.change(advanced, { target: { value: '{"sheet_resistance":' } });
    expect(within(workspace).getByRole("button", { name: "Apply JSON draft" })).toBeDisabled();
    expect(within(workspace).getByRole("button", { name: "Save material" })).toBeDisabled();
    expect(apiFetchMock).not.toHaveBeenCalledWith("/api/materials/11", expect.objectContaining({ method: "PATCH" }));

    // Repairing the JSON re-enables Apply, but the pending draft still
    // blocks the form save until it is applied or discarded (P1-1).
    fireEvent.change(advanced, { target: { value: JSON.stringify({ sheet_resistance: "7 ohm/sq", thickness_mm: 2.2 }) } });
    expect(within(workspace).getByRole("button", { name: "Save material" })).toBeDisabled();
    expect(within(workspace).getByRole("button", { name: "Apply JSON draft" })).toBeEnabled();
    fireEvent.click(within(workspace).getByRole("button", { name: "Apply JSON draft" }));
    expect(within(workspace).getByRole("button", { name: "Save material" })).toBeEnabled();
    fireEvent.click(within(workspace).getByRole("button", { name: "Save material" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/materials/11", {
        method: "PATCH",
        body: expect.objectContaining({
          specification: { sheet_resistance: "7 ohm/sq", thickness_mm: 2.2 },
        }),
      });
    });
  });

  it("previews the correct post-save status per role (P2-3)", async () => {
    // Student creation previews pending.
    const student = renderPage();
    await screen.findByText("FTO glass");
    fireEvent.click(screen.getByRole("button", { name: "New material" }));
    let workspace = screen.getByRole("region", { name: "New material" });
    fireEvent.change(within(workspace).getByLabelText(/^Material name/), { target: { value: "Student salt" } });
    expect(within(workspace).getByText("pending")).toBeInTheDocument();
    student.unmount();

    // Staff creation previews active, matching the existing API behavior.
    sessionState.role = "administrator";
    apiFetchMock.mockResolvedValue([activeMaterial]);
    renderPage();
    await screen.findByText("FTO glass");
    fireEvent.click(screen.getByRole("button", { name: "New material" }));
    workspace = screen.getByRole("region", { name: "New material" });
    fireEvent.change(within(workspace).getByLabelText(/^Material name/), { target: { value: "Staff salt" } });
    expect(within(workspace).getAllByText("active").length).toBeGreaterThan(0);
  });
});
