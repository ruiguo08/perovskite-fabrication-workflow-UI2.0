import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { setLanguage } from "./i18n";
import { formatDateTime } from "./lib/format";

vi.mock("./auth/session", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: () => ({
    user: { id: 1, username: "student", display_name: "SAM English Name", role: "student", workflow_access: true },
    status: "authenticated", logout: vi.fn(), refresh: vi.fn(),
  }),
}));

vi.mock("./components/PipelineHeader", () => ({ PipelineHeader: () => null }));
vi.mock("./pages/OverviewPage", () => ({
  OverviewPage: function DraftPage() {
    const [draft, setDraft] = useState("");
    return <><input aria-label="Draft" value={draft} onChange={(event) => setDraft(event.target.value)} /><p>{formatDateTime("2026-10-21T02:30:00Z")}</p></>;
  },
}));

describe("language changes within the application", () => {
  it("preserves the mounted route, unsaved draft, URL, and user content while refreshing dates", () => {
    window.history.replaceState({}, "", "/app/?tab=draft#notes");
    render(<App />);
    const draft = screen.getByRole("textbox", { name: "Draft" });
    fireEvent.change(draft, { target: { value: "NiOx 1500 rpm 30 s" } });
    fireEvent.click(screen.getByRole("button", { name: "中文" }));
    expect(screen.getByRole("textbox", { name: "Draft" })).toBe(draft);
    expect(draft).toHaveValue("NiOx 1500 rpm 30 s");
    expect(screen.getByRole("link", { name: "实验系列" })).toBeInTheDocument();
    expect(screen.getByText("SAM English Name")).toBeInTheDocument();
    expect(screen.getByText(formatDateTime("2026-10-21T02:30:00Z"))).toBeInTheDocument();
    expect(window.location.pathname + window.location.search + window.location.hash).toBe("/app/?tab=draft#notes");
  });

  it("keeps administrator routes forbidden in both languages", () => {
    setLanguage("zh");
    window.history.replaceState({}, "", "/app/users");
    render(<App />);
    expect(screen.getByText("无权访问")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "用户" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByText("Not authorized")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/app/users");
  });
});
