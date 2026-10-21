import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { StatusBadge } from "../components/StatusBadge";
import { LoginPage } from "../pages/LoginPage";
import { formatDateTime, formatRelativeTime } from "../lib/format";
import { DEFAULT_LANGUAGE, getLanguage, LANGUAGE_STORAGE_KEY, localizeAppText, readLanguagePreference, setLanguage, translate } from ".";
import { messages } from "./messages";

vi.mock("../auth/session", () => ({
  useSession: () => ({ login: vi.fn(), status: "unauthenticated", user: null }),
}));

afterEach(() => vi.restoreAllMocks());

describe("language preferences", () => {
  it("defaults to Chinese and accepts only supported saved preferences", () => {
    localStorage.clear();
    expect(readLanguagePreference()).toBe(DEFAULT_LANGUAGE);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "fr");
    expect(readLanguagePreference()).toBe("zh");
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    expect(readLanguagePreference()).toBe("en");
  });

  it("persists a selection, updates page metadata, and works without storage", () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "中文" }));
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("zh");
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(document.title).toBe("钙钛矿太阳能电池制备工作流");
    expect(screen.getByRole("button", { name: "中文" })).toHaveAttribute("aria-pressed", "true");
    vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("storage denied"); });
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(getLanguage()).toBe("en");
    expect(document.documentElement.lang).toBe("en-US");
    expect(document.title).toBe("Perovskite Solar Cell Fabrication Workflow");
  });

  it("updates mounted views when another tab changes the preference", () => {
    render(<LanguageSwitcher />);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "zh");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: LANGUAGE_STORAGE_KEY })));
    expect(screen.getByRole("group", { name: "语言" })).toBeInTheDocument();
  });
});

describe("bilingual UI behavior", () => {
  it("preserves login inputs, including the password, when switching languages", () => {
    render(<MemoryRouter initialEntries={["/login?next=/experiments/42?tab=plan"]}><LoginPage /></MemoryRouter>);
    const username = screen.getByLabelText(/^Username/);
    const password = screen.getByLabelText(/^Password/);
    fireEvent.change(username, { target: { value: "student-one" } });
    fireEvent.change(password, { target: { value: "unsaved-password" } });
    fireEvent.click(screen.getByRole("button", { name: "中文" }));
    expect(screen.getByRole("heading", { name: "登录" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^用户名/)).toBe(username);
    expect(screen.getByLabelText(/^密码/)).toBe(password);
    expect(username).toHaveValue("student-one");
    expect(password).toHaveValue("unsaved-password");
  });

  it("uses contextual statuses, preserves their color, and leaves unknown values intact", () => {
    setLanguage("zh");
    const { container } = render(<>
      <StatusBadge status="active" />
      <StatusBadge status="active" context="catalog" />
      <StatusBadge status="active" context="account" />
      <StatusBadge status="pending" context="catalog" />
      <StatusBadge status="planned" context="booking" />
      <StatusBadge status="new_server_status" />
    </>);
    expect(screen.getByText("进行中")).toHaveClass("status-badge--active");
    expect(screen.getByText("可用")).toHaveClass("status-badge--active");
    expect(screen.getByText("已启用")).toBeInTheDocument();
    expect(screen.getByText("待审核")).toHaveClass("status-badge--warning");
    expect(screen.getByText("已预约")).toBeInTheDocument();
    expect(screen.getByText("new server status")).toBeInTheDocument();
    const originalClasses = [...container.querySelectorAll("span")].map((item) => item.className);
    act(() => setLanguage("en"));
    expect([...container.querySelectorAll("span")].map((item) => item.className)).toEqual(originalClasses);
  });

  it("localizes dates without changing the timestamp or translating unit abbreviations", () => {
    const instant = "2026-10-21T02:30:00Z";
    setLanguage("zh");
    expect(formatDateTime(instant)).toBe(new Intl.DateTimeFormat("zh-CN", {
      year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(new Date(instant)));
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("invalid")).toBe("invalid");
    vi.spyOn(Date, "now").mockReturnValue(new Date(instant).getTime());
    expect(formatRelativeTime("2026-10-21T02:25:00Z")).toBe("5 min 前");
    setLanguage("en");
    expect(formatRelativeTime("2026-10-21T02:25:00Z")).toBe("5 min ago");
  });

  it("keeps matching interpolation tokens and treats inserted content literally", () => {
    for (const [english, chinese] of Object.values(messages)) {
      // English plural suffixes have no counterpart in Chinese; all data
      // placeholders must remain present in both languages.
      const tokens = (value: string) => [...value.matchAll(/\{\w+\}/g)].map(([token]) => token).filter((token) => !/^\{s\d*\}$/.test(token)).sort();
      expect(tokens(chinese)).toEqual(tokens(english));
    }
    expect(translate("nav.laterSection", { label: "SAM {n} <script>" }, "zh"))
      .toBe("SAM {n} <script>将在后续迁移阶段开放。");
  });

  it("localizes known validation messages without interpreting inserted names or unknown diagnostics", () => {
    setLanguage("zh");
    expect(localizeAppText("Control {n} NiOx requires a stock dispersion name and volume."))
      .toBe("Control {n} NiOx 需要原液名称和体积。");
    expect(localizeAppText("new backend diagnostic: abc-123")).toBe("new backend diagnostic: abc-123");
  });
});
