import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PasswordLink, PasswordPage } from "./PasswordPage";
import { setLanguage } from "../i18n";

const apiFetchMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({ apiFetch: apiFetchMock }));
vi.mock("../auth/session", () => ({ useSession: () => ({ refresh: refreshMock }) }));
vi.mock("../components/LanguageSwitcher", () => ({ LanguageSwitcher: () => null }));

function renderAt(path: string, recovery: boolean) {
  window.history.replaceState(null, "", path);
  return render(
    <MemoryRouter>
      <PasswordPage recovery={recovery} />
    </MemoryRouter>,
  );
}

describe("PasswordPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    refreshMock.mockReset();
    setLanguage("en");
  });

  it("changes the signed-in password and refreshes the revoked session", async () => {
    apiFetchMock.mockResolvedValue(undefined);
    renderAt("/account/password", false);

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "Current password 2026" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Replacement password 2026" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Replacement password 2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/password", {
      method: "POST",
      body: { current_password: "Current password 2026", password: "Replacement password 2026" },
    }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(await screen.findByText("Password saved. Sign in with your new password.")).toBeInTheDocument();
  });

  it("blocks submission until the confirmation matches", async () => {
    renderAt("/account/password", false);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "Current password 2026" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Replacement password 2026" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Different password 2026" } });

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match.");
    expect(screen.getByRole("button", { name: "Save password" })).toBeDisabled();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("shows the backend rejection after a failed change", async () => {
    apiFetchMock.mockRejectedValue(new Error("Current password is incorrect or the account is locked."));
    renderAt("/account/password", false);
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "Wrong password 2026" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Replacement password 2026" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Replacement password 2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Current password is incorrect/);
    // The form clears the rejected secrets.
    await waitFor(() => expect(screen.getByLabelText("Current password")).toHaveValue(""));
  });

  it("redeems a recovery token from the fragment and scrubs the URL", async () => {
    apiFetchMock.mockImplementation((path: string) => {
      if (path === "/api/auth/login-csrf") return Promise.resolve({ login_csrf_token: "csrf-1" });
      return Promise.resolve(undefined);
    });
    renderAt("/set-password#token=one-time-token-value", true);

    expect(window.location.hash).toBe("");
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Recovered password 2026" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Recovered password 2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Save password" }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/api/auth/set-password", {
      method: "POST",
      body: { token: "one-time-token-value", password: "Recovered password 2026", login_csrf: "csrf-1" },
    }));
    expect(await screen.findByText("Password saved. Sign in with your new password.")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("refuses redemption when the token is missing", async () => {
    renderAt("/set-password", true);
    expect(screen.getByRole("alert")).toHaveTextContent(/incomplete/i);
    expect(screen.getByRole("button", { name: "Save password" })).toBeDisabled();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("renders the recovery hints bilingually", () => {
    renderAt("/set-password", true);
    expect(screen.getByText("Set your own password using the one-time link provided by your administrator.")).toBeInTheDocument();
    act(() => setLanguage("zh"));
    expect(screen.getByText("通过管理员提供的一次性链接设置本人密码。")).toBeInTheDocument();
  });
});

describe("PasswordLink", () => {
  beforeEach(() => {
    setLanguage("en");
  });

  it("shows the absolute link once with a copy affordance", () => {
    render(<PasswordLink url="/app/set-password#token=abc" />);
    const field = screen.getByLabelText("One-time password link");
    expect(field).toHaveValue(`${window.location.origin}/app/set-password#token=abc`);
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByText(/expires in 30 minutes/i)).toBeInTheDocument();
  });
});
