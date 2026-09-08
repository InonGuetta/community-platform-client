import { test, expect, describe } from "vitest";
import { outputScaleFor, MAX_OUTPUT_SCALE, MAX_CANVAS_PIXELS } from "./canvasScale";

// A4 at the scale a page is shown at when it fits a 950px column.
const A4 = { width: 950, height: 1344 };

describe("how many bitmap pixels a page is drawn with", () => {
  // The bug. A canvas drawn at the CSS size and displayed on a 1.25 display is
  // upscaled by the browser, and thin Hebrew glyphs do not survive it.
  test("a scaled display gets the pixels it can actually show", () => {
    expect(outputScaleFor(A4, 1.25)).toBe(1.25);
    expect(outputScaleFor(A4, 2)).toBe(2);
  });

  test("an ordinary display is drawn one to one", () => {
    expect(outputScaleFor(A4, 1)).toBe(1);
  });

  // Past 2 the pixels are past what the display resolves, and each one is memory
  // held for as long as the page stays near the viewport — on a 547-page book
  // that is the difference between openable and not.
  test("a very dense display is capped rather than followed", () => {
    expect(outputScaleFor(A4, 3)).toBe(MAX_OUTPUT_SCALE);
    expect(outputScaleFor(A4, 4)).toBe(MAX_OUTPUT_SCALE);
  });

  // The budget is what keeps resolution from costing the page: over it, the
  // browser refuses the allocation and the reader gets a blank sheet.
  test("a huge page is pulled back inside the bitmap budget", () => {
    const zoomed = { width: 3800, height: 5376 };  // A4 at the 4x zoom ceiling
    const scale = outputScaleFor(zoomed, 2);

    expect(scale).toBeLessThan(2);
    expect(zoomed.width * scale * zoomed.height * scale).toBeLessThanOrEqual(MAX_CANVAS_PIXELS + 1);
  });

  // Deliberately allowed below 1. A soft page is worth having; a missing one is
  // not, and at this size 1:1 is already past what a browser will allocate.
  test("a page bigger than the budget on its own is drawn smaller than 1:1", () => {
    const enormous = { width: 8000, height: 11000 };
    const scale = outputScaleFor(enormous, 1);

    expect(scale).toBeLessThan(1);
    expect(scale).toBeGreaterThan(0);
  });

  // What getViewport returns before a page has been measured — which in a
  // virtualised viewer is every page that has not been drawn yet. A scale of 0
  // would size a canvas of no pixels, which IS a blank page.
  test("an unmeasured page is drawn one to one rather than not at all", () => {
    expect(outputScaleFor({ width: 0, height: 0 }, 2)).toBe(1);
    expect(outputScaleFor(null, 2)).toBe(1);
    expect(outputScaleFor({ width: NaN, height: 100 }, 2)).toBe(1);
  });

  // Some environments report no ratio at all — jsdom among them, and a test that
  // renders this component would otherwise size every canvas by NaN.
  test("a display that reports no ratio is treated as one to one", () => {
    expect(outputScaleFor(A4, undefined)).toBe(1);
    expect(outputScaleFor(A4, 0)).toBe(1);
    expect(outputScaleFor(A4, -1)).toBe(1);
  });
});
