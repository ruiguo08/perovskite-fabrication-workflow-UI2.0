import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SpecificationEditor } from "./SpecificationEditor";

function renderEditor(specification: Record<string, unknown>) {
  const onChange = vi.fn();
  const onValidityChange = vi.fn();
  render(
    <SpecificationEditor
      idPrefix="spec"
      specification={specification}
      onChange={onChange}
      onValidityChange={onValidityChange}
    />,
  );
  return { onChange, onValidityChange };
}

function lastObject(mock: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  return mock.mock.calls[mock.mock.calls.length - 1][0] as Record<string, unknown>;
}

function openAdvanced() {
  fireEvent.click(screen.getByRole("button", { name: /Advanced specification editor \(JSON\)/ }));
}

function editAdvanced(text: string) {
  fireEvent.change(screen.getByLabelText("Advanced specification (JSON)"), { target: { value: text } });
}

function applyAdvanced() {
  fireEvent.click(screen.getByRole("button", { name: "Apply JSON draft" }));
}

describe("SpecificationEditor", () => {
  it("renders scalar rows from the record and keeps unknown keys", () => {
    renderEditor({ purity: "99.9%", lot: 7 });
    expect(screen.getByLabelText("Specification key purity")).toHaveValue("purity");
    expect(screen.getByLabelText("Value for purity")).toHaveValue("99.9%");
    expect(screen.getByLabelText("Value for lot")).toHaveValue("7");
  });

  it("edits text values through the row and emits a new object", () => {
    const { onChange } = renderEditor({ purity: "99%" });
    fireEvent.change(screen.getByLabelText("Value for purity"), { target: { value: "99.9%" } });
    expect(lastObject(onChange)).toEqual({ purity: "99.9%" });
  });

  it("keeps numbers as numbers and rejects invalid numeric input", () => {
    const { onChange, onValidityChange } = renderEditor({ lot: 7 });
    const valueInput = screen.getByLabelText("Value for lot");
    fireEvent.change(valueInput, { target: { value: "9" } });
    expect(lastObject(onChange)).toEqual({ lot: 9 });
    expect(typeof lastObject(onChange).lot).toBe("number");

    fireEvent.change(valueInput, { target: { value: "not-a-number" } });
    expect(screen.getByText("Enter a number.")).toBeInTheDocument();
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
    // The last valid object is unchanged while the row is invalid.
    expect(onChange).toHaveBeenLastCalledWith({ lot: 9 });
  });

  it("treats an emptied number field as an error, never a silent 0 (P1-3)", () => {
    function Host() {
      const [spec, setSpec] = useState<Record<string, unknown>>({ thickness: 7 });
      const [valid, setValid] = useState(true);
      return (
        <div>
          <SpecificationEditor idPrefix="spec" specification={spec} onChange={setSpec} onValidityChange={setValid} />
          <button type="button" data-testid="save" disabled={!valid}>Save</button>
          <output data-testid="emitted">{JSON.stringify(spec)}</output>
        </div>
      );
    }
    render(<Host />);

    fireEvent.change(screen.getByLabelText("Value for thickness"), { target: { value: "" } });
    expect(screen.getByText("Enter a number, or remove the row.")).toBeInTheDocument();
    expect(screen.getByTestId("save")).toBeDisabled();
    // The stored value is still the original 7 — not 0, not null.
    expect(JSON.parse(screen.getByTestId("emitted").textContent ?? "{}").thickness).toBe(7);

    // A fresh row switched to Number without a value is an error too.
    fireEvent.click(screen.getByRole("button", { name: "Add specification row" }));
    fireEvent.change(screen.getByLabelText("Specification key new-field-1"), { target: { value: "cycles" } });
    fireEvent.change(screen.getByLabelText("Value type for cycles"), { target: { value: "number" } });
    expect(screen.getAllByText("Enter a number, or remove the row.").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("save")).toBeDisabled();

    // A legal explicit zero is kept as a number — but the emptied thickness
    // row still blocks saving until it is fixed or removed.
    fireEvent.change(screen.getByLabelText("Value for cycles"), { target: { value: "0" } });
    expect(screen.getByTestId("save")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Value for thickness"), { target: { value: "7" } });
    expect(screen.getByTestId("save")).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));
    const saved = JSON.parse(screen.getByTestId("emitted").textContent ?? "{}");
    expect(saved.cycles).toBe(0);
    expect(typeof saved.cycles).toBe("number");
    expect(saved.thickness).toBe(7);
  });

  it("toggles boolean rows", () => {
    const { onChange } = renderEditor({ coated: false });
    fireEvent.change(screen.getByLabelText("Value for coated"), { target: { value: "true" } });
    expect(lastObject(onChange)).toEqual({ coated: true });
  });

  it("adds and removes rows and flags duplicate keys", () => {
    const { onChange, onValidityChange } = renderEditor({ purity: "99%" });
    fireEvent.click(screen.getByRole("button", { name: "Add specification row" }));
    fireEvent.change(screen.getByLabelText("Specification key new-field-1"), { target: { value: "purity" } });
    expect(screen.getAllByText("This key is used more than once.").length).toBeGreaterThanOrEqual(1);
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    fireEvent.change(screen.getByLabelText("Specification key new-field-1"), { target: { value: "grade" } });
    fireEvent.change(screen.getByLabelText("Value for grade"), { target: { value: "lab" } });
    expect(lastObject(onChange)).toEqual({ purity: "99%", grade: "lab" });

    fireEvent.click(screen.getByRole("button", { name: "Remove specification row grade" }));
    expect(lastObject(onChange)).toEqual({ purity: "99%" });
  });

  it("flags scalar keys colliding with kept arrays or objects across the whole namespace (P1-4)", () => {
    function Host() {
      const [spec, setSpec] = useState<Record<string, unknown>>({
        purity: "99%",
        nested: { units: "nm" },
        treatments: ["UV"],
      });
      const [valid, setValid] = useState(true);
      return (
        <div>
          <SpecificationEditor idPrefix="spec" specification={spec} onChange={setSpec} onValidityChange={setValid} />
          <button type="button" data-testid="save" disabled={!valid}>Save</button>
          <output data-testid="emitted">{JSON.stringify(spec)}</output>
        </div>
      );
    }
    render(<Host />);

    // Renaming a scalar row onto a kept object key is an error and blocks saving.
    fireEvent.change(screen.getByLabelText("Specification key purity"), { target: { value: "nested" } });
    expect(screen.getByText("This key is already used by a kept array or object value.")).toBeInTheDocument();
    expect(screen.getByTestId("save")).toBeDisabled();

    // The record is untouched: purity keeps its value, nested keeps its object.
    const untouched = JSON.parse(screen.getByTestId("emitted").textContent ?? "{}");
    expect(untouched.purity).toBe("99%");
    expect(untouched.nested).toEqual({ units: "nm" });
    expect(untouched.treatments).toEqual(["UV"]);

    // Same for an added row.
    fireEvent.change(screen.getByLabelText("Specification key purity"), { target: { value: "purity" } });
    fireEvent.click(screen.getByRole("button", { name: "Add specification row" }));
    fireEvent.change(screen.getByLabelText("Specification key new-field-1"), { target: { value: "treatments" } });
    expect(screen.getByText("This key is already used by a kept array or object value.")).toBeInTheDocument();
    expect(screen.getByTestId("save")).toBeDisabled();

    // Resolving the conflict restores validity.
    fireEvent.change(screen.getByLabelText("Specification key new-field-1"), { target: { value: "steps" } });
    fireEvent.change(screen.getByLabelText("Value for steps"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Value type for steps"), { target: { value: "number" } });
    expect(screen.getByTestId("save")).toBeEnabled();
  });

  it("never flattens arrays and objects; they stay in the emitted object", () => {
    const complex = { additives: ["LiBr", "MACl"], gradient: { top: 1, bottom: 2 } };
    const { onChange } = renderEditor({ purity: "99%", ...complex });
    fireEvent.change(screen.getByLabelText("Value for purity"), { target: { value: "99.9%" } });
    const emitted = lastObject(onChange);
    expect(emitted.additives).toEqual(["LiBr", "MACl"]);
    expect(emitted.gradient).toEqual({ top: 1, bottom: 2 });
    expect(screen.getByText(/Kept without changes \(edit in the advanced editor\): additives, gradient/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Value for additives")).not.toBeInTheDocument();
  });

  it("a valid but unapplied draft blocks saving until Apply or Discard (P1-1)", () => {
    function Host() {
      const [spec, setSpec] = useState<Record<string, unknown>>({ purity: "99%" });
      const [valid, setValid] = useState(true);
      return (
        <div>
          <SpecificationEditor idPrefix="spec" specification={spec} onChange={setSpec} onValidityChange={setValid} />
          <button type="button" data-testid="save" disabled={!valid}>Save material</button>
          <output data-testid="emitted">{JSON.stringify(spec)}</output>
        </div>
      );
    }
    render(<Host />);

    openAdvanced();
    // Typing an invalid JSON keeps the applied object and disables saving.
    editAdvanced('{"purity":');
    expect(screen.getByText("Specification must be valid JSON.")).toBeInTheDocument();
    expect(screen.getByTestId("save")).toBeDisabled();
    expect(JSON.parse(screen.getByTestId("emitted").textContent ?? "{}")).toEqual({ purity: "99%" });

    // Valid JSON that is not an object is invalid as well.
    editAdvanced("[1, 2]");
    expect(screen.getByText("Specification must be a JSON object.")).toBeInTheDocument();
    expect(screen.getByTestId("save")).toBeDisabled();

    // A valid draft still blocks saving until it is explicitly applied —
    // saving now must not silently submit the older object.
    editAdvanced(JSON.stringify({ purity: "99.9%" }));
    expect(screen.getByText(/Apply or discard the JSON draft before saving/)).toBeInTheDocument();
    expect(screen.getByTestId("save")).toBeDisabled();
    expect(JSON.parse(screen.getByTestId("emitted").textContent ?? "{}")).toEqual({ purity: "99%" });

    // Apply commits the draft and re-enables saving with the new object.
    applyAdvanced();
    expect(screen.getByTestId("save")).toBeEnabled();
    expect(JSON.parse(screen.getByTestId("emitted").textContent ?? "{}")).toEqual({ purity: "99.9%" });
    expect(screen.getByLabelText("Value for purity")).toHaveValue("99.9%");
  });

  it("discarding a pending draft re-enables saving of the applied object (P1-1)", () => {
    function Host() {
      const [spec, setSpec] = useState<Record<string, unknown>>({ purity: "99%" });
      const [valid, setValid] = useState(true);
      return (
        <div>
          <SpecificationEditor idPrefix="spec" specification={spec} onChange={setSpec} onValidityChange={setValid} />
          <button type="button" data-testid="save" disabled={!valid}>Save material</button>
          <output data-testid="emitted">{JSON.stringify(spec)}</output>
        </div>
      );
    }
    render(<Host />);

    openAdvanced();
    editAdvanced(JSON.stringify({ purity: "99.9%" }));
    expect(screen.getByTestId("save")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
    expect(screen.getByTestId("save")).toBeEnabled();
    expect(JSON.parse(screen.getByTestId("emitted").textContent ?? "{}")).toEqual({ purity: "99%" });
    expect(screen.getByLabelText("Value for purity")).toHaveValue("99%");
  });

  it("a valid advanced object repairs duplicate-row errors and restores validity (P1-1)", () => {
    function Host() {
      const [spec, setSpec] = useState<Record<string, unknown>>({ purity: "99%" });
      const [valid, setValid] = useState(true);
      return (
        <div>
          <SpecificationEditor idPrefix="spec" specification={spec} onChange={setSpec} onValidityChange={setValid} />
          <button type="button" data-testid="save" disabled={!valid}>Save material</button>
        </div>
      );
    }
    render(<Host />);

    // Create a duplicate-key error in row mode.
    fireEvent.click(screen.getByRole("button", { name: "Add specification row" }));
    fireEvent.change(screen.getByLabelText("Specification key new-field-1"), { target: { value: "purity" } });
    expect(screen.getByTestId("save")).toBeDisabled();

    // A complete valid advanced object replaces the record and lifts the error.
    openAdvanced();
    editAdvanced(JSON.stringify({ purity: "98%", grade: "lab" }));
    applyAdvanced();
    expect(screen.getByTestId("save")).toBeEnabled();
    expect(screen.getByLabelText("Value for purity")).toHaveValue("98%");
    expect(screen.getByLabelText("Value for grade")).toHaveValue("lab");
    expect(screen.queryByLabelText("Specification key new-field-1")).not.toBeInTheDocument();
  });

  it("row edits land in the applied object and the advanced view mirrors them (P1-2)", () => {
    function Host() {
      const [spec, setSpec] = useState<Record<string, unknown>>({ purity: "99%" });
      return (
        <div>
          <SpecificationEditor idPrefix="spec" specification={spec} onChange={setSpec} />
          <output data-testid="emitted">{JSON.stringify(spec)}</output>
        </div>
      );
    }
    render(<Host />);

    // Row edit first.
    fireEvent.change(screen.getByLabelText("Value for purity"), { target: { value: "99.9%" } });
    expect(JSON.parse(screen.getByTestId("emitted").textContent ?? "{}").purity).toBe("99.9%");

    // Opening the advanced editor shows the current object, not a stale draft.
    openAdvanced();
    expect(screen.getByLabelText("Advanced specification (JSON)")).toHaveValue(
      JSON.stringify({ purity: "99.9%" }, null, 2),
    );

    // Advanced draft with a nested object, applied, then edited again by rows.
    // Apply keeps the advanced editor open with rows paused; exit first.
    editAdvanced(JSON.stringify({ purity: "99.9%", profile: { high: 1 } }));
    applyAdvanced();
    expect(JSON.parse(screen.getByTestId("emitted").textContent ?? "{}").profile).toEqual({ high: 1 });
    expect(screen.getByLabelText("Value for purity")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Hide advanced specification editor/ }));
    expect(screen.getByLabelText("Value for purity")).toBeEnabled();

    fireEvent.change(screen.getByLabelText("Value for purity"), { target: { value: "97%" } });
    expect(JSON.parse(screen.getByTestId("emitted").textContent ?? "{}").purity).toBe("97%");
    expect(JSON.parse(screen.getByTestId("emitted").textContent ?? "{}").profile).toEqual({ high: 1 });

    // Reopening the advanced editor mirrors the newest object (rows last).
    openAdvanced();
    expect(screen.getByLabelText("Advanced specification (JSON)")).toHaveValue(
      JSON.stringify({ purity: "97%", profile: { high: 1 } }, null, 2),
    );
  });

  it("pauses row editing while a draft is open, so neither overwrites the other (P1-2)", () => {
    renderEditor({ purity: "99%" });
    openAdvanced();
    editAdvanced(JSON.stringify({ purity: "99.1%" }));

    // Rows are disabled while the draft is pending.
    expect(screen.getByLabelText("Value for purity")).toBeDisabled();
    expect(screen.getByLabelText("Specification key purity")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add specification row" })).toBeDisabled();

    // Closing with a valid draft applies it.
    fireEvent.click(screen.getByRole("button", { name: /Hide advanced specification editor/ }));
    expect(screen.getByLabelText("Value for purity")).toHaveValue("99.1%");
    expect(screen.getByLabelText("Value for purity")).toBeEnabled();
  });

  it("an invalid draft blocks closing; Discard clears error and aria-invalid (P2-1)", () => {
    const { onChange } = renderEditor({ purity: "99%" });
    openAdvanced();
    editAdvanced('{"purity": "99.1"');  // invalid JSON
    fireEvent.click(screen.getByRole("button", { name: /Hide advanced specification editor/ }));
    // The editor stays open with the error visible.
    expect(screen.getByLabelText("Advanced specification (JSON)")).toBeInTheDocument();
    expect(screen.getByText("Specification must be valid JSON.")).toBeInTheDocument();

    // Discard drops the draft and returns to the applied object.
    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
    fireEvent.click(screen.getByRole("button", { name: /Hide advanced specification editor/ }));
    expect(screen.queryByLabelText("Advanced specification (JSON)")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Value for purity")).toHaveValue("99%");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("Discard of a non-object draft clears the JSON error and aria-invalid (P2-1)", () => {
    const { onChange, onValidityChange } = renderEditor({ purity: "99%" });
    openAdvanced();
    editAdvanced("[1,2]");
    expect(screen.getByLabelText("Advanced specification (JSON)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Specification must be a JSON object.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Discard draft" }));
    // The field remounts with the applied object, no residual error state.
    const advanced = screen.getByLabelText("Advanced specification (JSON)") as HTMLTextAreaElement;
    expect(JSON.parse(advanced.value)).toEqual({ purity: "99%" });
    expect(screen.queryByText("Specification must be a JSON object.")).not.toBeInTheDocument();
    expect(advanced).not.toHaveAttribute("aria-invalid", "true");
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("removing every row yields an empty object without losing complex entries", () => {
    const { onChange } = renderEditor({ note: "kept", tags: ["x"] });
    fireEvent.click(screen.getByRole("button", { name: "Remove specification row note" }));
    expect(lastObject(onChange)).toEqual({ tags: ["x"] });
  });
});
