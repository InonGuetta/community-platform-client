// @vitest-environment jsdom
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SegmentedControl from "./SegmentedControl";
import { nextIndex } from "./segmentedKeys";

const OPTIONS = [
  { value: "student", label: "תלמיד" },
  { value: "lecturer", label: "מרצה" },
  { value: "admin", label: "מנהל" },
];

describe("as toggle buttons (the default)", () => {
  test("each option is a button that says whether it is pressed", () => {
    render(<SegmentedControl label="תפקיד" options={OPTIONS} value="lecturer" onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "תפקיד" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "מרצה" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "תלמיד" })).toHaveAttribute("aria-pressed", "false");
  });

  test("a click reports the new choice, and pressing the chosen one reports nothing", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="תפקיד" options={OPTIONS} value="student" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "מנהל" }));
    expect(onChange).toHaveBeenCalledWith("admin");
    await userEvent.click(screen.getByRole("button", { name: "תלמיד" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  test("a disabled option cannot be chosen", async () => {
    const onChange = vi.fn();
    const options = [...OPTIONS.slice(0, 2), { value: "admin", label: "מנהל", disabled: true, tooltip: "בקרוב" }];
    render(<SegmentedControl label="תפקיד" options={options} value="student" onChange={onChange} />);
    const admin = screen.getByRole("button", { name: "מנהל" });
    expect(admin).toBeDisabled();
    // Clicked through, as a pointer would land on it.
    await userEvent.setup({ pointerEventsCheck: 0 }).click(admin);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("as a radio group", () => {
  test("radios with aria-checked, and one tab stop on the chosen one", () => {
    render(<SegmentedControl semantics="radio" label="תצוגה" options={OPTIONS} value="lecturer" onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "תצוגה" })).toBeInTheDocument();
    const chosen = screen.getByRole("radio", { name: "מרצה" });
    expect(chosen).toHaveAttribute("aria-checked", "true");
    expect(chosen).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "תלמיד" })).toHaveAttribute("tabindex", "-1");
  });

  test("the arrow keys move the choice, forward being leftward in Hebrew", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl semantics="radio" label="תצוגה" options={OPTIONS} value="student" onChange={onChange} />);
    screen.getByRole("radio", { name: "תלמיד" }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("lecturer");
    expect(screen.getByRole("radio", { name: "מרצה" })).toHaveFocus();
  });
});

test("nextIndex wraps, skips disabled options, and follows the direction", () => {
  const opts = [{}, { disabled: true }, {}, {}];
  expect(nextIndex(opts, 0, "ArrowRight", false)).toBe(2);
  expect(nextIndex(opts, 0, "ArrowLeft", true)).toBe(2);
  expect(nextIndex(opts, 0, "ArrowLeft", false)).toBe(3);
  expect(nextIndex(opts, 3, "ArrowDown")).toBe(0);
  expect(nextIndex(opts, 2, "Home")).toBe(0);
  expect(nextIndex(opts, 0, "End")).toBe(3);
  expect(nextIndex(opts, 0, "Enter")).toBeNull();
  expect(nextIndex([{ disabled: true }], 0, "ArrowRight")).toBeNull();
});
