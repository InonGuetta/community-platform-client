import { test, expect, describe } from "vitest";
import bidiFactory from "bidi-js";
import { createVisualiser } from "./hebrewPdf";

// Which way round the exported PDF actually reads.
//
// A PDF stores text VISUALLY: it draws glyphs at coordinates and has no notion
// of direction, so the writer reorders every line before drawing it. That pass
// is the most consequential thing in hebrewPdf.js and the least obvious, and
// nothing downstream can catch it being wrong — a backwards page is a valid
// PDF.
//
// The export now puts several things into Hebrew lines that are not Hebrew:
// footnote marks in square brackets, timestamps, separators, and occasionally a
// lecture with a Latin name. Brackets and dashes are NEUTRAL characters whose
// direction is decided by what surrounds them, which is exactly the case that
// goes wrong quietly.
//
// The expectations below are written in VISUAL order — the order the glyphs are
// painted, left to right. To read one as a person would, read it right to left.

const toVisual = createVisualiser(bidiFactory());

describe("a Hebrew line with a footnote mark in it", () => {
  // Painted: ...םשו [1] האר — which read right-to-left is "ראה [1] ושם", with
  // the brackets enclosing the number the way an RTL reader expects.
  test("the mark stays where it was written, between the words", () => {
    expect(toVisual("ראה [1] ושם")).toBe("םשו [1] האר");
  });

  test("a mark at the start of a sentence is painted at the RIGHT edge", () => {
    // Last in the visual string means first on a right-aligned RTL line.
    expect(toVisual("[1] ושם נאמר")).toBe("רמאנ םשו [1]");
  });

  test("two marks keep their order", () => {
    expect(toVisual("ראה [1] וגם [2] בעניין")).toBe("ןיינעב [2] םגו [1] האר");
  });
});

describe("the line printed at the foot of the page", () => {
  // The one that begins with a number and ends with a timestamp — every kind of
  // neutral character in a single line.
  test("it begins at the right with its mark and ends with the minute", () => {
    expect(toVisual("[1] בבא קמא ב · בעניין יתרו · 12:22"))
      .toBe("12:22 · ורתי ןיינעב · ב אמק אבב [1]");
  });

  // The archive has lectures with Latin titles, and a blunt right-to-left flip
  // would render them backwards — which is the specific failure the writer's
  // isInputVisual flag exists to prevent.
  test("a Latin title inside it is not reversed", () => {
    const visual = toVisual("[2] Rambam Hilchot Deot · פרק א · 5:03");

    expect(visual).toContain("Rambam Hilchot Deot");
    expect(visual).not.toContain("tamabmaR");
  });
});

describe("what must never be reversed", () => {
  test("a timestamp reads as a time, not backwards", () => {
    expect(toVisual("ראה [1] ▶ שיעור · 45:12 — בעניין יתרו")).toContain("45:12");
  });

  test("a range of numbers survives", () => {
    // "15-17" reversed would be "71-51", which was the original bug this
    // machinery was built to fix.
    expect(toVisual("סעיף 15-17 בשולחן ערוך")).toBe("ךורע ןחלושב 15-17 ףיעס");
  });

  test("a year inside brackets in a heading", () => {
    expect(toVisual("בדיקה 02 — מתוך: שיעור (11 באוגוסט 2026)"))
      .toBe("(2026 טסוגואב 11) רועיש :ךותמ — 02 הקידב");
  });
});

// The inline style puts the whole reference into the sentence: a mark, the
// lecture, a separator, a timestamp, a dash and the user's own words. If any
// arrangement is going to come out scrambled it is this one.
test("a whole inline source keeps its parts in order", () => {
  const visual = toVisual("ראה [1] בבא קמא ב · 12:22 — בעניין יתרו ושם");

  expect(visual).toBe("םשו ורתי ןיינעב — 12:22 · ב אמק אבב [1] האר");
});

// Plain Hebrew with nothing unusual in it, as the control: if this were wrong
// everything above would be meaningless.
test("ordinary Hebrew is simply reversed for painting", () => {
  expect(toVisual("שלום עולם")).toBe("םלוע םולש");
  expect([...toVisual("שלום עולם")].reverse().join("")).toBe("םלוע םולש".split("").reverse().join(""));
});
