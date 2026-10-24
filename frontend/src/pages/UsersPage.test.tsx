import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../components/Toast";
import { UsersPage } from "./UsersPage";
import { setLanguage } from "../i18n";

const apiFetchMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());
const grantsMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({ apiFetch: apiFetchMock }));
vi.mock("../features/booking/api", () => ({ bookingPages: grantsMock }));
vi.mock("../auth/session", () => ({
  useSession: () => ({ user: { id: 1, role: "administrator" }, refresh: refreshMock }),
}));

const administrator = {
  id: 1,
  username: "admin",
  display_name: "Administrator",
  role: "administrator",
  is_active: true,
  locked_until: null,
  last_login_at: "2026-08-12T08:00:00Z",
  password_changed_at: "2026-08-01T08:00:00Z",
  created_at: "2026-08-01T08:00:00Z",
  updated_at: "2026-08-12T08:00:00Z",
};

const student = {
  ...administrator,
  id: 2,
  username: "student-one",
  display_name: "Student One",
  role: "student",
  is_active: false,
  last_login_at: null,
};

function renderPage() {
  return render(<ToastProvider><UsersPage /></ToastProvider>);
}

describe("UsersPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    refreshMock.mockReset();
    grantsMock.mockReset().mockResolvedValue([
      { user_id: 1, granted_at: "2026-08-01T08:00:00Z", revoked_at: null },
    ]);
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path.startsWith("/api/booking/workflow-access/") && options?.method === "PUT") {
        return Promise.resolve({ user_id: 2, workflow_access: true });
      }
      return Promise.resolve([administrator, student]);
    });
  });

  it("keeps grants unknown and disabled until the initial read completes", async () => {
    let finishRead!: (rows: unknown[]) => void;
    grantsMock.mockReturnValue(new Promise((resolve) => { finishRead = resolve; }));
    renderPage();
    const checkbox = await screen.findByRole("checkbox", { name: "Fabrication workflow access for admin" });
    expect(checkbox).toBeDisabled();
    expect(checkbox).toBePartiallyChecked();
    fireEvent.click(checkbox);
    expect(apiFetchMock).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: "PUT" }));
    await act(async () => finishRead([{ user_id: 1, revoked_at: null }]));
    expect(checkbox).toBeEnabled();
    expect(checkbox).toBeChecked();
  });

  it("shows read failures as unknown and retries before permitting edits", async () => {
    grantsMock.mockRejectedValueOnce(new Error("read failed"));
    renderPage();
    const checkbox = await screen.findByRole("checkbox", { name: "Fabrication workflow access for admin" });
    expect(await screen.findByText("Unable to read workflow access. Retry before changing permissions.")).toBeInTheDocument();
    expect(checkbox).toBeDisabled();
    expect(checkbox).toBePartiallyChecked();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(checkbox).toBeEnabled());
    expect(checkbox).toBeChecked();
  });

  it("ignores an older grant read after two concurrent successful writes", async () => {
    let finishOlder!: (rows: unknown[]) => void;
    let finishNewer!: (rows: unknown[]) => void;
    grantsMock.mockResolvedValueOnce([])
      .mockImplementationOnce(() => new Promise((resolve) => { finishOlder = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { finishNewer = resolve; }));
    renderPage();
    const admin = await screen.findByRole("checkbox", { name: "Fabrication workflow access for admin" });
    const student = screen.getByRole("checkbox", { name: "Fabrication workflow access for student-one" });
    await waitFor(() => expect(admin).toBeEnabled());
    fireEvent.click(admin);
    fireEvent.click(student);
    await waitFor(() => expect(grantsMock).toHaveBeenCalledTimes(3));
    await act(async () => finishNewer([{ user_id: 1, revoked_at: null }, { user_id: 2, revoked_at: null }]));
    expect(admin).toBeChecked();
    expect(student).toBeChecked();
    await act(async () => finishOlder([]));
    expect(admin).toBeChecked();
    expect(student).toBeChecked();
  });

  it("does not reread grants when saving account roles", async () => {
    apiFetchMock.mockImplementation((_path: string, options?: { method?: string }) =>
      options?.method === "PATCH" ? Promise.resolve(administrator) : Promise.resolve([administrator, student]));
    renderPage();
    await screen.findByText("Student One");
    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Fabrication workflow access for admin" })).toBeChecked());
    fireEvent.click(screen.getByRole("button", { name: "Save access for admin" }));
    await screen.findByText("Account access updated.");
    expect(grantsMock).toHaveBeenCalledTimes(1);
  });

  it("marks grants unknown if the read after a saved write fails", async () => {
    grantsMock.mockReset().mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("read failed"));
    renderPage();
    const checkbox = await screen.findByRole("checkbox", { name: "Fabrication workflow access for student-one" });
    await waitFor(() => expect(checkbox).toBeEnabled());
    fireEvent.click(checkbox);
    await screen.findByText("Unable to read workflow access. Retry before changing permissions.");
    expect(checkbox).toBeDisabled();
    expect(checkbox).toBePartiallyChecked();
    expect(apiFetchMock).toHaveBeenCalledWith("/api/booking/workflow-access/2", { method: "PUT", body: { enabled: true } });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("lists account metadata without rendering secret fields", async () => {
    renderPage();

    expect(await screen.findByText("Student One")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByText(/password_hash/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/failed_login_count/i)).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/generate a one-time password link for/i)).toHaveLength(2);
  });

  it("renders activity labels separately from their timestamp values", async () => {
    renderPage();

    await screen.findByText("Student One");
    expect(screen.getAllByText("Last login")).toHaveLength(2);
    expect(screen.getAllByText("Password changed")).toHaveLength(2);
  });

  it("creates an account without a password and shows the one-time activation link", async () => {
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/users" && options?.method === "POST") {
        return Promise.resolve({
          ...student, id: 3, username: "new-student", display_name: "New Student", is_active: true,
          activation_url: "/app/set-password#token=abc123", activation_expires_at: "2026-08-12T09:00:00Z",
        });
      }
      return Promise.resolve([administrator, student]);
    });
    renderPage();

    await screen.findByText("Student One");
    fireEvent.change(screen.getByLabelText(/^Username/), { target: { value: "new-student" } });
    fireEvent.change(screen.getByLabelText(/^Display name/), { target: { value: "New Student" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("New Student")).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledWith("/api/users", {
      method: "POST",
      body: {
        username: "new-student",
        display_name: "New Student",
        role: "student",
      },
    });
    const linkField = await screen.findByLabelText("One-time password link");
    expect(linkField).toHaveValue(`${window.location.origin}/app/set-password#token=abc123`);
  });

  it("keeps Chinese role choices as API enums and retains an unsaved form across language changes", async () => {
    setLanguage("zh");
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/users" && options?.method === "POST") {
        return Promise.resolve({ ...student, id: 3, username: "new-instructor", display_name: "Control NiOx", role: "instructor", is_active: true });
      }
      return Promise.resolve([administrator, student]);
    });
    renderPage();
    await screen.findByText("Student One");
    const username = screen.getByLabelText(/^用户名/);
    fireEvent.change(username, { target: { value: "new-instructor" } });
    fireEvent.change(screen.getByLabelText(/^显示名称/), { target: { value: "Control NiOx" } });
    const roleInput = screen.getByLabelText(/^角色/);
    fireEvent.change(roleInput, { target: { value: "instructor" } });
    const requestsBeforeSwitch = apiFetchMock.mock.calls.length;
    act(() => setLanguage("en"));
    expect(screen.getByLabelText(/^Username/)).toBe(username);
    expect(roleInput).toHaveValue("instructor");
    expect(apiFetchMock).toHaveBeenCalledTimes(requestsBeforeSwitch);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/api/users", {
      method: "POST", body: {
        username: "new-instructor", display_name: "Control NiOx", role: "instructor",
      },
    }));
    expect(await screen.findByText("Control NiOx")).toBeInTheDocument();
  });

  it("updates access and keeps self-deactivation errors inline", async () => {
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/users/2" && options?.method === "PATCH") {
        return Promise.resolve({ ...student, role: "instructor", is_active: true });
      }
      if (path === "/api/users/1" && options?.method === "PATCH") {
        return Promise.reject(new Error("you cannot deactivate your own account"));
      }
      return Promise.resolve([administrator, student]);
    });
    renderPage();

    const studentRow = await screen.findByRole("row", { name: /Student One/ });
    fireEvent.change(within(studentRow).getByLabelText("Role for student-one"), { target: { value: "instructor" } });
    fireEvent.click(within(studentRow).getByLabelText("Active account for student-one"));
    fireEvent.click(within(studentRow).getByRole("button", { name: "Save access for student-one" }));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/api/users/2", {
      method: "PATCH",
      body: { role: "instructor", is_active: true },
    }));

    const adminRow = screen.getByRole("row", { name: /Administrator/ });
    fireEvent.click(within(adminRow).getByLabelText("Active account for admin"));
    fireEvent.click(within(adminRow).getByRole("button", { name: "Save access for admin" }));
    expect(await within(adminRow).findByRole("alert")).toHaveTextContent("you cannot deactivate your own account");
  });

  it("generates a one-time link and replaces it when generated again", async () => {
    let issued = 0;
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/users/2/password-link" && options?.method === "POST") {
        issued += 1;
        return Promise.resolve({ url: `/app/set-password#token=issue-${issued}`, expires_at: "2026-08-12T09:00:00Z" });
      }
      return Promise.resolve([administrator, student]);
    });
    renderPage();

    const studentRow = await screen.findByRole("row", { name: /Student One/ });
    fireEvent.click(within(studentRow).getByRole("button", { name: "Generate a one-time password link for student-one" }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/api/users/2/password-link", { method: "POST" }));
    expect(await within(studentRow).findByLabelText("One-time password link"))
      .toHaveValue(`${window.location.origin}/app/set-password#token=issue-1`);

    fireEvent.click(within(studentRow).getByRole("button", { name: "Generate a one-time password link for student-one" }));
    await waitFor(() =>
      expect(within(studentRow).getByLabelText("One-time password link"))
        .toHaveValue(`${window.location.origin}/app/set-password#token=issue-2`));
    expect(within(studentRow).getAllByLabelText("One-time password link")).toHaveLength(1);
  });

  it("shows an inline error when link generation fails", async () => {
    apiFetchMock.mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/api/users/2/password-link" && options?.method === "POST") {
        return Promise.reject(new Error("active account not found"));
      }
      return Promise.resolve([administrator, student]);
    });
    renderPage();

    const studentRow = await screen.findByRole("row", { name: /Student One/ });
    fireEvent.click(within(studentRow).getByRole("button", { name: "Generate a one-time password link for student-one" }));

    expect(await within(studentRow).findByRole("alert")).toHaveTextContent("active account not found");
    expect(within(studentRow).queryByLabelText("One-time password link")).not.toBeInTheDocument();
  });
});
