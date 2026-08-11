import { test, expect } from "vitest";
import { STAGE_ASPECT, stageHeightForWidth } from "./stageGeometry";

// Two consumers rely on these agreeing: the player draws its stage with the CSS
// string, and the media page sizes its side panel with the function. The panel
// only looks right — and only stops collapsing next to an audio bar — while both
// describe the same shape.
test("the height it computes matches the ratio the stage is drawn at", () => {
  const [width, height] = STAGE_ASPECT.split("/").map((part) => Number(part.trim()));

  expect(stageHeightForWidth(width)).toBe(height);
  expect(stageHeightForWidth(1600)).toBe(900);
});

// It is called with whatever a ResizeObserver last reported, which is 0 before
// the first measurement and undefined if a caller forgets to pass it. The page
// feeds the result into Math.max, where a NaN would poison the panel's height
// and collapse it — the exact failure this function exists to prevent.
test("an unmeasured width is zero, never NaN", () => {
  expect(stageHeightForWidth(0)).toBe(0);
  expect(stageHeightForWidth(undefined)).toBe(0);
  expect(stageHeightForWidth(null)).toBe(0);
  expect(stageHeightForWidth(NaN)).toBe(0);
});
