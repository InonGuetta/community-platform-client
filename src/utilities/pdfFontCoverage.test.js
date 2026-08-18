// @vitest-environment jsdom
// Parses note bodies, so it needs a DOM — and reads the font off disk, which
// vitest's node APIs allow.
import { test, expect, describe } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createSourceRegistry, noteTextWithSources, SOURCE_STYLES } from "./noteFootnotes";
import { sourceChipHtml, sourceFootnoteLabel } from "./noteSource";

// Can the PDF actually DRAW what the export writes?
//
// This exists because of a bug that no amount of testing the logic could have
// found. The bidi pass was correct, the layout was correct, the text was
// correct — and every source in an exported PDF still printed an empty box,
// because the chip's "▶" is a Geometric Shapes character and the embedded font
// is Noto Sans Hebrew, which has Hebrew, Latin and punctuation and nothing
// else. A missing glyph raises no error anywhere: jsPDF draws .notdef and the
// document looks finished.
//
// So the assertion is not about any one character. It is: everything this
// application puts into a PDF is a character that font can draw. The next
// symbol somebody reaches for fails here instead of in a document.

// From the project root, which is where vitest runs. import.meta.url is not a
// file: URL under the jsdom environment.
const FONT = readFileSync(resolve(process.cwd(), "src/assets/fonts/NotoSansHebrew-Regular.ttf"));

// A minimal TrueType cmap reader. The alternative was adding a font-parsing
// library as a dev dependency to answer one yes/no question per character.
const coveredCodePoints = () => {
  const u16 = (at) => FONT.readUInt16BE(at);
  const u32 = (at) => FONT.readUInt32BE(at);

  let cmapAt = 0;
  for (let i = 0; i < u16(4); i++) {
    const rec = 12 + i * 16;
    if (FONT.toString("ascii", rec, rec + 4) === "cmap") cmapAt = u32(rec + 8);
  }
  if (!cmapAt) throw new Error("the font has no cmap table");

  // Prefer the widest Unicode subtable the font offers.
  let best = null;
  for (let i = 0; i < u16(cmapAt + 2); i++) {
    const rec = cmapAt + 4 + i * 8;
    const platform = u16(rec);
    const encoding = u16(rec + 2);
    if (!(platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10)))) continue;
    const at = cmapAt + u32(rec + 4);
    const format = u16(at);
    if (!best || format > best.format) best = { at, format };
  }
  if (!best) throw new Error("the font has no unicode cmap subtable");

  const has = (code) => {
    if (best.format === 4) {
      const segX2 = u16(best.at + 6);
      const ends = best.at + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const rangeOffsets = deltas + segX2;

      for (let s = 0; s < segX2 / 2; s++) {
        if (u16(ends + s * 2) < code) continue;
        if (u16(starts + s * 2) > code) return false;
        const rangeOffset = u16(rangeOffsets + s * 2);
        if (rangeOffset === 0) return ((code + u16(deltas + s * 2)) & 0xffff) !== 0;
        return u16(rangeOffsets + s * 2 + rangeOffset + (code - u16(starts + s * 2)) * 2) !== 0;
      }
      return false;
    }
    for (let g = 0; g < u32(best.at + 12); g++) {
      const rec = best.at + 16 + g * 12;
      if (code >= u32(rec) && code <= u32(rec + 4)) return true;
    }
    return false;
  };

  return has;
};

const has = coveredCodePoints();

// Whitespace is not drawn, so it is never missing.
const undrawable = (text) =>
  [...new Set([...text])]
    .filter((c) => !/\s/.test(c) && !has(c.codePointAt(0)))
    .map((c) => `${c} (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")})`);

const BOOKMARK = {
  mediaId: 12,
  timestampSeconds: 742,
  mediaTitle: "בבא קמא ב",
  note: "בעניין יתרו ומשה רבנו",
  mediaType: "audio",
};

const NOTE_BODY = `<div>מה שנאמר כאן ${sourceChipHtml(BOOKMARK)} הוא העיקר</div>`;

describe("everything the PDF writes, the PDF font can draw", () => {
  // The style that produced the bug: the chip's own content goes into the
  // document, and the chip is built for a screen.
  test("a note exported with its sources inline", () => {
    const text = noteTextWithSources(NOTE_BODY, createSourceRegistry(), SOURCE_STYLES.inline);

    expect(undrawable(text)).toEqual([]);
    // And the marker really is gone rather than merely drawable.
    expect(text).not.toContain("▶");
  });

  test("a note exported with footnote marks", () => {
    const text = noteTextWithSources(NOTE_BODY, createSourceRegistry(), SOURCE_STYLES.footnotes);

    expect(undrawable(text)).toEqual([]);
  });

  test("a note exported with no sources at all", () => {
    const text = noteTextWithSources(NOTE_BODY, createSourceRegistry(), SOURCE_STYLES.none);

    expect(undrawable(text)).toEqual([]);
  });

  // The lines printed at the foot of the page, which are built separately from
  // anything above and could drift on their own.
  test("the footnote lines", () => {
    const registry = createSourceRegistry();
    noteTextWithSources(NOTE_BODY, registry, SOURCE_STYLES.footnotes);

    for (const label of Object.values(registry.labels())) {
      expect(undrawable(`[1] ${label}`)).toEqual([]);
    }
    expect(undrawable(sourceFootnoteLabel(BOOKMARK))).toEqual([]);
  });

  // The separators and the ellipsis the export reaches for on its own, listed
  // by hand so that a change to any of them is a change to this line too.
  test("the punctuation the export chooses for itself", () => {
    expect(undrawable("[]·—…:()0123456789")).toEqual([]);
  });

  // The character that started this, kept as a standing reminder that the font
  // is narrow: it covers Hebrew, Latin and punctuation, and a symbol picked for
  // the screen is not automatically printable.
  test("the font really is missing the chip's screen marker", () => {
    expect(has("▶".codePointAt(0))).toBe(false);
    expect(has("א".codePointAt(0))).toBe(true);
    expect(has("A".codePointAt(0))).toBe(true);
  });
});
