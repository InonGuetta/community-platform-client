// @vitest-environment jsdom
// The writer reaches for fetch and for a font asset, both of which are the
// browser's.
import { test, expect, describe, vi, beforeEach } from "vitest";

// A stand-in for jsPDF that records what was drawn and where. The real thing
// produces a binary file and hands it to a download; what is worth asserting is
// the LAYOUT — which line went on which page, and what was printed at the foot
// of each — and that is exactly what the calls say.
const fake = vi.hoisted(() => ({ calls: [] }));

vi.mock("jspdf", () => ({
  jsPDF: class {
    addFileToVFS() {}
    addFont() {}
    setFont() {}
    setFontSize(size) { this.size = size; }
    setTextColor(...rgb) { this.colour = rgb.join(","); }
    setDrawColor() {}
    setLineWidth() {}
    // Every block handed to it here is already one line; the real one measures
    // against the page width, which no assertion below depends on.
    splitTextToSize(text) { return String(text).split("\n"); }
    line() { fake.calls.push({ type: "rule", page: this.page ?? 0 }); }
    text(content, _x, y) {
      fake.calls.push({ type: "text", content, y, size: this.size, colour: this.colour, page: this.page ?? 0 });
    }
    addPage() { this.page = (this.page ?? 0) + 1; fake.calls.push({ type: "page", page: this.page }); }
    save(filename) { fake.calls.push({ type: "save", filename }); }
  },
}));

// The bidi pass is stubbed to the identity so the assertions below can be
// written in reading order. What it does is real and load-bearing — a PDF
// stores text visually — but it is not what these tests are about, and a
// document reordered for the page cannot be asserted against legibly.
vi.mock("bidi-js", () => ({
  default: () => ({ getEmbeddingLevels: () => ({}), getReorderedString: (line) => line }),
}));

const { downloadHebrewPdf } = await import("./hebrewPdf");

// A page holds about 35 lines of body text, so this is comfortably two pages.
const LINES_PER_PAGE = 35;
const filler = (count, word = "שורה") => Array.from({ length: count }, (_, i) => `${word} ${i + 1}`).join("\n");

const write = (sections, footnotes) =>
  downloadHebrewPdf({ sections, footnotes, filename: "x.pdf" });

const onPage = (page) => fake.calls.filter((call) => call.type === "text" && call.page === page);
const footnotesOn = (page) => onPage(page).filter((call) => call.size === 9).map((call) => call.content);

beforeEach(() => {
  fake.calls.length = 0;
  global.fetch = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
});

describe("sources at the foot of the page", () => {
  test("a document that cites nothing is unchanged", async () => {
    await write([{ text: "שורה אחת" }], {});

    expect(fake.calls.some((call) => call.type === "rule")).toBe(false);
    expect(fake.calls.filter((call) => call.type === "text")).toHaveLength(1);
  });

  test("a mark prints its source at the bottom, in blue and smaller", async () => {
    await write([{ text: "ראה [1] ושם" }], { 1: "בבא קמא ב · בעניין יתרו · 12:22" });

    const footnote = onPage(0).find((call) => call.size === 9);
    expect(footnote.content).toContain("בבא קמא ב · בעניין יתרו · 12:22");
    expect(footnote.colour).toBe("21,101,187");

    // Bottom-aligned rather than trailing the text: with one line of body above
    // it, a note that simply followed on would be at the top of the page.
    expect(footnote.y).toBeGreaterThan(270);
    // And the rule that separates it from the body was drawn.
    expect(fake.calls.some((call) => call.type === "rule")).toBe(true);
  });

  // The whole point of doing this in the writer rather than at the end of the
  // document: the writer is the only part of the system that knows where the
  // pages break.
  test("each page carries the sources cited ON it", async () => {
    await write(
      [{ text: `ראשון [1]\n${filler(LINES_PER_PAGE)}\nשני [2]` }],
      { 1: "שיעור ראשון", 2: "שיעור שני" }
    );

    expect(fake.calls.some((call) => call.type === "page")).toBe(true);
    expect(footnotesOn(0).join(" ")).toContain("שיעור ראשון");
    expect(footnotesOn(0).join(" ")).not.toContain("שיעור שני");
    expect(footnotesOn(1).join(" ")).toContain("שיעור שני");
    expect(footnotesOn(1).join(" ")).not.toContain("שיעור ראשון");
  });

  // A source cited three times in a page is one line at the foot of it. The
  // registry already gives repeats the same number; this is the other half.
  test("a source cited twice on one page is printed once", async () => {
    await write([{ text: "ראה [1] וגם [1] ושוב [1]" }], { 1: "שיעור" });

    expect(footnotesOn(0)).toHaveLength(1);
  });

  // The last page never breaks, so without an explicit flush its sources would
  // be collected and then silently dropped.
  // The last page never breaks, so without an explicit flush its sources would
  // be collected and then silently dropped.
  test("the final page's sources are not lost", async () => {
    await write([{ text: `${filler(LINES_PER_PAGE)}\nאחרון [1]` }], { 1: "שיעור אחרון" });

    const lastPage = Math.max(...fake.calls.filter((call) => call.type === "text").map((call) => call.page));
    expect(footnotesOn(lastPage).join(" ")).toContain("שיעור אחרון");
  });

  // The room the notes need is part of whether a line of body text still fits.
  // A line that would have fitted on its own moves to the next page once the
  // source it cites is counted — which is the alternative to drawing the notes
  // over the sentence that cites them.
  test("a line that no longer fits once its source is counted moves down", async () => {
    const lines = `${filler(LINES_PER_PAGE - 1)}\nהאחרונה [1]`;

    await write([{ text: lines }], { 1: "שיעור" });

    // Without the reservation this line, and its note, would have stayed on
    // page one.
    expect(fake.calls.some((call) => call.type === "page")).toBe(true);
    expect(footnotesOn(0)).toEqual([]);
    expect(footnotesOn(1).join(" ")).toContain("שיעור");
  });

  test("the notes sit below every line of body text on their page", async () => {
    await write([{ text: `ראה [1]\n${filler(10)}` }], { 1: "שיעור" });

    const body = onPage(0).filter((call) => call.size === 12);
    const footnote = onPage(0).find((call) => call.size === 9);

    expect(Math.max(...body.map((call) => call.y))).toBeLessThan(footnote.y);
  });

  // A mark with nothing registered against it is text the user typed — "[3]"
  // in a sentence — and must not reserve space or print an empty note.
  test("a bracketed number that is not a source is left alone", async () => {
    await write([{ text: "סעיף [3] בשולחן ערוך" }], { 1: "שיעור" });

    expect(fake.calls.some((call) => call.type === "rule")).toBe(false);
  });
});
