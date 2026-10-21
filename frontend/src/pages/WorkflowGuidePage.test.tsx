import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { setLanguage } from "../i18n";
import { WorkflowGuidePage } from "./WorkflowGuidePage";

describe("workflow diagram enlargement", () => {
  it("renders the selected-language SVG as an image and keeps the dialog open across language changes", async () => {
    render(<MemoryRouter><WorkflowGuidePage /></MemoryRouter>);
    const open = screen.getByRole("button", { name: "Enlarge diagram" });
    fireEvent.click(open);
    const dialog = screen.getByRole("dialog", { name: "The full path at a glance" });
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", expect.stringContaining("user-workflow-sop.svg"));
    act(() => setLanguage("zh"));
    expect(screen.getByRole("dialog", { name: "全流程一览" })).toBe(dialog);
    expect(within(dialog).getByRole("img")).toHaveAttribute("src", expect.stringContaining("user-workflow-sop-zh.svg"));
    fireEvent.click(within(dialog).getByRole("button", { name: "关闭" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(open).toBeInTheDocument();
  });
});
