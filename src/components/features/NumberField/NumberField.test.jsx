// @vitest-environment jsdom
import { useState } from "react";
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NumberField from "./NumberField";

// The numeric field (UI_UX_FIXES 1.3): no minus, plus or exponent, no decimal
// point for whole numbers, clamped on blur, an empty value back to its default.

const Harness = ({ initial = 5, ...props }) => {
  const [value, setValue] = useState(initial);
  return (
    <>
      <NumberField label="num" value={value} onChange={setValue} {...props} />
      <output data-testid="out">{String(value)}</output>
    </>
  );
};
const input = () => screen.getByLabelText("num");
const out = () => screen.getByTestId("out").textContent;

test("keys that make no whole number are refused", () => {
  render(<Harness initial="" min={2} max={500} />);
  for (const key of ["-", "+", "e", "E", ".", ","]) {
    expect(fireEvent.keyDown(input(), { key })).toBe(false);
  }
  expect(fireEvent.keyDown(input(), { key: "7" })).toBe(true);
});

test("a field that takes fractions lets the point through", () => {
  render(<Harness initial="" integer={false} />);
  expect(fireEvent.keyDown(input(), { key: "." })).toBe(true);
  expect(fireEvent.keyDown(input(), { key: "-" })).toBe(false);
});

test("sets the range, the step, a numeric keyboard and left-to-right text on the input", () => {
  render(<Harness min={2} max={500} />);
  expect(input()).toHaveAttribute("min", "2");
  expect(input()).toHaveAttribute("max", "500");
  expect(input()).toHaveAttribute("inputmode", "numeric");
  expect(input()).toHaveAttribute("dir", "ltr");
});

test("blur clamps to the range", async () => {
  render(<Harness initial="" min={2} max={500} />);
  const user = userEvent.setup();
  await user.type(input(), "900");
  await user.tab();
  expect(input().value).toBe("500");
  expect(out()).toBe("500");
  await user.clear(input());
  await user.type(input(), "1");
  await user.tab();
  expect(out()).toBe("2");
});

test("an empty field goes back to the default on blur", async () => {
  render(<Harness initial={10} min={2} max={500} defaultValue={10} />);
  const user = userEvent.setup();
  await user.clear(input());
  await user.tab();
  expect(input().value).toBe("10");
  expect(out()).toBe("10");
});

test("an optional field may stay empty", async () => {
  render(<Harness initial="" min={10} allowEmpty />);
  const user = userEvent.setup();
  await user.click(input());
  await user.tab();
  expect(input().value).toBe("");
});

test("says the range while the value is outside it", async () => {
  render(<Harness initial="" min={2} max={500} />);
  const user = userEvent.setup();
  await user.type(input(), "1");
  expect(input()).toHaveAttribute("aria-invalid", "true");
  expect(document.querySelector("p.MuiFormHelperText-root")).toBeTruthy();
});

test("a pasted negative arrives without its sign", () => {
  const onChange = vi.fn();
  render(<NumberField label="num" value="" onChange={onChange} min={10} />);
  fireEvent.paste(input(), { clipboardData: { getData: () => "-50" } });
  expect(input().value).toBe("50");
  expect(onChange).toHaveBeenLastCalledWith(50);
});

test("follows a value the parent sets", () => {
  const { rerender } = render(<NumberField label="num" value={10} onChange={() => {}} />);
  rerender(<NumberField label="num" value={2} onChange={() => {}} />);
  expect(input().value).toBe("2");
});
