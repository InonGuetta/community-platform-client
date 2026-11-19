// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, act } from "@testing-library/react";
import i18n from "../../../i18n/i18n";
import { sidesOf } from "../../../i18n/useDirection";
import DirectionalIcon from "./DirectionalIcon";

// Which glyph each meaning draws, in each direction. MUI marks an icon with
// data-testid="<Name>Icon", which is what is read here.
const glyph = (props) => {
  const { container, unmount } = render(<DirectionalIcon {...props} />);
  const name = container.querySelector("svg").getAttribute("data-testid");
  unmount();
  return name;
};

test("in Hebrew, back points right and forward points left", () => {
  expect(glyph({ toward: "back" })).toBe("ArrowForwardIcon");
  expect(glyph({ toward: "forward" })).toBe("ArrowBackIcon");
  expect(glyph({ toward: "forward", shape: "chevron" })).toBe("ChevronLeftIcon");
  expect(glyph({ toward: "back", shape: "keyboardArrow" })).toBe("KeyboardArrowRightIcon");
});

test("in English, back points left and forward points right", async () => {
  await act(() => i18n.changeLanguage("en"));
  expect(glyph({ toward: "back" })).toBe("ArrowBackIcon");
  expect(glyph({ toward: "forward" })).toBe("ArrowForwardIcon");
  expect(glyph({ toward: "forward", shape: "chevron" })).toBe("ChevronRightIcon");
  expect(glyph({ toward: "back", shape: "keyboardArrow" })).toBe("KeyboardArrowLeftIcon");
});

test("Yiddish reads like Hebrew", async () => {
  await act(() => i18n.changeLanguage("yi"));
  expect(glyph({ toward: "back" })).toBe("ArrowForwardIcon");
});

test("the physical sides a line starts and ends on", () => {
  expect(sidesOf("rtl")).toEqual({ start: "right", end: "left" });
  expect(sidesOf("ltr")).toEqual({ start: "left", end: "right" });
});
