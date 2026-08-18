import fontUrl from "../assets/fonts/NotoSansHebrew-Regular.ttf?url";

// Writing a Hebrew document to PDF in the browser.
//
// Was transcriptPdf.js, which is what it was first written for. Nothing in it is
// about transcripts — it is a Hebrew text writer — and the notebook's export
// needs exactly the same two hard parts, so it is named for what it does rather
// than for its first caller.
//
// Generating a PDF directly — rather than handing the user a print dialog —
// means taking on the two jobs a browser's print engine normally does for us:
//
//  1. A font. The 14 PDF base fonts have no Hebrew glyphs at all, so a Hebrew
//     document needs one embedded. Noto Sans Hebrew (OFL) covers Hebrew and
//     Latin, so mixed lines survive.
//  2. Bidi. A PDF stores text in VISUAL order — it draws glyphs at coordinates
//     and has no notion of direction. Handing it a logical-order Hebrew string
//     paints the sentence backwards. bidi-js implements the real Unicode
//     Bidirectional Algorithm, which is what keeps "15-17" and "Whisper" from
//     being reversed inside an otherwise right-to-left line.
//
// Everything heavy here (jsPDF, the bidi tables, the 48KB font) is pulled in on
// demand: this runs when someone clicks download, and must not sit in the
// bundle everyone loads.

const FONT_NAME = "NotoSansHebrew";
const FONT_VFS = "NotoSansHebrew-Regular.ttf";

// A4 in millimetres, which is also jsPDF's unit here.
const PAGE = { width: 210, height: 297 };
const MARGIN = { top: 20, bottom: 20, x: 18 };
const BODY_SIZE = 12;
const HEADING_SIZE = 14;
const TITLE_SIZE = 17;
const LINE_HEIGHT = 1.7;

// The sources cited on a page, printed at the foot of THAT page.
//
// Smaller and tighter than the body, in the blue the notebook already uses for
// a source chip, so a reference reads as apparatus rather than as more text.
const FOOTNOTE_SIZE = 9;
const FOOTNOTE_LINE_HEIGHT = 1.35;
const FOOTNOTE_COLOR = [21, 101, 187];
// Between the last line of body text and the rule above the notes.
const FOOTNOTE_GAP = 3;

// Marks are written into the text as "[1]" — see utilities/noteFootnotes.js.
// This is how a line is asked which sources it cites.
const MARK_PATTERN = /\[(\d+)\]/g;
// Deduplicated: one line can easily cite the same lecture twice — "ראה [1]
// ושוב [1]" — and a page's foot wants one entry per source, not one per mark.
const marksIn = (line) => [...new Set([...line.matchAll(MARK_PATTERN)].map((match) => Number(match[1])))];

/**
 * Turn one logical line into the VISUAL order a PDF stores text in.
 *
 * Exported, and taking the bidi instance as an argument, for one reason: this
 * is the single most consequential line in the file and the hardest to reason
 * about, and a test that reimplemented it would be testing its own copy. The
 * caller below already loads bidi-js; a test loads its own and gets the same
 * function.
 *
 * Paragraph direction is RTL: this is Hebrew, and it decides where a line that
 * is entirely digits or Latin ends up.
 */
export const createVisualiser = (bidi) => (line) =>
  bidi.getReorderedString(line, bidi.getEmbeddingLevels(line, "rtl"));

const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  // Chunked rather than one spread: a 48KB font is ~48k arguments, which
  // overflows the call stack in String.fromCharCode on some engines.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

let fontPromise = null;
// Cached across calls: the bytes never change, and a second download in the
// same session should not re-fetch and re-encode them.
const loadFontBase64 = () => {
  if (!fontPromise) {
    fontPromise = fetch(fontUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`font ${r.status}`);
        return r.arrayBuffer();
      })
      .then(toBase64)
      .catch((err) => { fontPromise = null; throw err; });
  }
  return fontPromise;
};

/**
 * Write a Hebrew document and hand it to the browser as a download.
 *
 * `sections` is a list of `{ heading, text }`. A transcript is one section with
 * no heading; the notebook exports one per note, where the heading is the note's
 * title — which is why this takes a list rather than a single string. A section
 * with neither heading nor text is skipped rather than printed as a blank gap.
 *
 * `footnotes` is an optional `{ 1: "lecture · point · 12:22", … }`. Any "[1]"
 * appearing in the text is then printed at the foot of the page it landed on —
 * which is a thing only this writer can do, because it is the only part of the
 * system that knows where the pages break. A caller with no sources passes
 * nothing and the document is unchanged.
 */
export const downloadHebrewPdf = async ({ title, sections, filename, footnotes = {} }) => {
  const [{ jsPDF }, { default: bidiFactory }, fontBase64] = await Promise.all([
    import("jspdf"),
    import("bidi-js"),
    loadFontBase64(),
  ]);

  const toVisual = createVisualiser(bidiFactory());

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.addFileToVFS(FONT_VFS, fontBase64);
  doc.addFont(FONT_VFS, FONT_NAME, "normal");
  doc.setFont(FONT_NAME, "normal");

  const maxWidth = PAGE.width - MARGIN.x * 2;
  const rightEdge = PAGE.width - MARGIN.x;
  let y = MARGIN.top;

  const drawLine = (logicalLine, atY) => {
    // isInputVisual is the load-bearing flag. Left to itself, jsPDF reverses
    // the whole string when it spots RTL characters — a blunt flip that gets
    // the Hebrew right and silently reverses every Latin word and number
    // inside it ("Whisper" → "repsihW", "15-17" → "71-51"). Declaring the
    // input already-visual suppresses that pass and leaves bidi-js's correct
    // ordering intact. "right" makes the line END at the right margin rather
    // than start there and run off the page.
    doc.text(toVisual(logicalLine), rightEdge, atY, {
      align: "right",
      isInputVisual: true,
      isOutputVisual: true,
    });
  };

  // The sources cited so far on the page being written, in the order their
  // marks appeared. Emptied by every page break.
  let pageMarks = [];
  const footnoteStep = (FOOTNOTE_SIZE * FOOTNOTE_LINE_HEIGHT) / 2.835;

  // A footnote can be longer than one line — a lecture title plus the point
  // inside it plus a timestamp — so the block's height is measured in LINES,
  // not in entries. Measured at the footnote's own size, because
  // splitTextToSize breaks against whatever size is currently set.
  const footnoteLinesFor = (marks) => {
    if (marks.length === 0) return [];
    doc.setFontSize(FOOTNOTE_SIZE);
    return marks.flatMap((mark) => doc.splitTextToSize(`[${mark}] ${footnotes[mark]}`, maxWidth));
  };

  const footnoteHeight = (marks) =>
    marks.length === 0 ? 0 : FOOTNOTE_GAP + footnoteLinesFor(marks).length * footnoteStep;

  // Print this page's sources and start the next page's collection empty.
  const flushFootnotes = () => {
    if (pageMarks.length === 0) return;

    const lines = footnoteLinesFor(pageMarks);
    // Bottom-aligned: the notes sit ON the bottom margin however much body text
    // is above them, which is what makes them read as the foot of the page
    // rather than as a paragraph that happens to be last.
    const top = Math.max(MARGIN.top, PAGE.height - MARGIN.bottom - lines.length * footnoteStep);

    doc.setDrawColor(...FOOTNOTE_COLOR);
    doc.setLineWidth(0.2);
    // A short rule, as a footnote separator has been since long before
    // computers — a full-width line reads as a table.
    doc.line(rightEdge - 50, top - 2, rightEdge, top - 2);

    doc.setTextColor(...FOOTNOTE_COLOR);
    doc.setFontSize(FOOTNOTE_SIZE);
    lines.forEach((line, index) => drawLine(line, top + footnoteStep * (index + 0.75)));
    doc.setTextColor(0, 0, 0);

    pageMarks = [];
  };

  const startPage = () => {
    flushFootnotes();
    doc.addPage();
    y = MARGIN.top;
  };

  // Line breaking happens on the LOGICAL string and reordering only after, per
  // line. Doing it the other way round would break lines at positions that do
  // not exist in the reading order.
  const writeBlock = (block, size, gapAfter) => {
    doc.setFontSize(size);
    const lineStep = (size * LINE_HEIGHT) / 2.835; // pt → mm

    for (const logicalLine of doc.splitTextToSize(block, maxWidth)) {
      // What this line would ADD to the foot of the page, which is part of
      // whether the line itself still fits: a line carrying the first mark of a
      // three-line source needs room for both.
      const arriving = marksIn(logicalLine).filter((mark) => footnotes[mark] && !pageMarks.includes(mark));
      const reserved = footnoteHeight([...pageMarks, ...arriving]);

      if (y + lineStep > PAGE.height - MARGIN.bottom - reserved) {
        // The line moves to the next page, and so do its sources — which is why
        // the marks are committed after this and not before.
        startPage();
      }
      pageMarks.push(...arriving);

      // Restored because measuring the footnotes above changed it.
      doc.setFontSize(size);
      drawLine(logicalLine, y);
      y += lineStep;
    }
    y += gapAfter;
  };

  const writeText = (text) => {
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    for (const paragraph of paragraphs) {
      // A hard newline inside a paragraph is still a line break to honour.
      for (const sub of paragraph.split("\n")) writeBlock(sub, BODY_SIZE, 0);
      y += 3;
    }
  };

  if (title) writeBlock(title, TITLE_SIZE, 5);

  for (const section of sections) {
    if (!section?.heading && !section?.text) continue;
    if (section.heading) writeBlock(section.heading, HEADING_SIZE, 2);
    if (section.text) writeText(section.text);
    y += 4;
  }

  // The last page never breaks, so nothing else would print its sources.
  flushFootnotes();

  doc.save(filename);
};

// Filenames reach the OS, where these characters are either illegal or path
// separators. Hebrew is left alone — only the reserved set is stripped.
export const safeFileBaseName = (title, fallback) =>
  (title || fallback).replace(/[\\/:*?"<>|]/g, "").trim() || fallback;
