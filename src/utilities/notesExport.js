import { noteBodyToHtml } from "./noteHtml";
import {
  createSourceRegistry,
  noteTextWithSources,
  noteHtmlWithSources,
  wordFootnoteList,
  SOURCE_STYLES,
} from "./noteFootnotes";

// Exporting a run of notes, as a PDF or as a Word document.
//
// Kept out of the page for the same reason the PDF writer is: this is a decision
// about what the exported DOCUMENT says — which notes, in what order, under what
// headings — and it is easier to see and to change when it is not tangled up in
// a screen's rendering.
//
// The two formats are NOT the same document, and the difference is worth knowing
// before choosing between them:
//
//   * PDF is the notes' TEXT. Bold, colours, sizes and pasted images do not
//     survive it, because the writer draws lines of glyphs at coordinates —
//     rendering HTML into a PDF is a different and much larger job. It is the
//     format the app already produces for a lecture transcript.
//   * Word keeps EVERYTHING, images included, because a .doc is opened from
//     HTML — which is exactly what a note already is.

const formatExportDate = (value) =>
  value ? new Date(value).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : "";

// The heading over one note in the document: its title, and — when the note was
// written from a lecture — which lecture, because that is often the only thing
// that identifies an untitled note.
const headingFor = (note) => {
  const title = note.title?.trim() || "(ללא כותרת)";
  const source = note.media_title ? ` — מתוך: ${note.media_title}` : "";
  const date = formatExportDate(note.updated_at);
  return `${title}${source}${date ? ` (${date})` : ""}`;
};

// The name the file is offered under. One note keeps its own; a set of them
// cannot, so it is named for the notebook and the day it was taken out.
//
// `named` is a title the USER gave this document — one of several notebooks a
// split export is producing. It wins over both defaults, and it also turns the
// per-note headings back on for a document holding a single note: normally
// those are suppressed because the document title already IS the note's title,
// but a notebook the user named "פרק א" and a note called "רש\"י על הפסוק" are
// two different pieces of information and printing only the first loses one.
const documentNames = (notes, named) => {
  const custom = named?.trim();
  const single = !custom && notes.length === 1 ? notes[0] : null;
  const title = custom || (single ? (single.title?.trim() || "הערה ללא כותרת") : "המחברת שלי");
  return {
    single,
    title,
    base: custom || (single ? title : `המחברת שלי - ${new Date().toLocaleDateString("he-IL")}`),
  };
};

/**
 * Write the given notes to a PDF and hand it to the browser.
 *
 * `notes` arrives in the order the screen shows them, and that order is kept:
 * the export should read the way the notebook does, not the way the database
 * happened to return the rows.
 */
export const downloadNotesPdf = async (notes, { title: named, sources = SOURCE_STYLES.footnotes } = {}) => {
  const { downloadHebrewPdf, safeFileBaseName } = await import("./hebrewPdf");
  const { single, title, base } = documentNames(notes, named);

  // One registry for the whole document: a lecture cited in three notes is one
  // number and one footnote, not three. Filled by the conversion below — which
  // is why the sections are built before the writer is called rather than
  // lazily inside it.
  const registry = createSourceRegistry();
  const sections = notes.map((note) => ({
    // A single note needs no heading — the document title is already its own —
    // and repeating it would print the same line twice.
    heading: single ? null : headingFor(note),
    text: noteTextWithSources(note.body, registry, sources),
  }));

  await downloadHebrewPdf({
    title,
    sections,
    // Only the footnote style puts anything at the foot of a page: inline
    // sources are already complete where they stand, and a document exported
    // without sources has none to print. The writer takes an empty map as "this
    // document has no footnotes", which is exactly right for both.
    footnotes: sources === SOURCE_STYLES.footnotes ? registry.labels() : {},
    filename: `${safeFileBaseName(base, "המחברת שלי")}.pdf`,
  });
};

// Hand a blob to the browser as a download. The anchor has to be IN the document
// for the click to count in Firefox, and the object URL has to outlive the click
// — hence the revoke on a later tick rather than on the next line.
const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/**
 * Write the given notes to a Word document and hand it to the browser.
 *
 * Word opens HTML — it has done since Word 2000, which is why "save as .doc"
 * from a web page has always worked — and a note IS HTML. So the export is the
 * notes' own markup wrapped in a document, and everything the toolbar can do
 * survives into Word: bold, colours, highlights, sizes and pasted images, which
 * the PDF route cannot carry.
 *
 * It is HTML in a .doc, not a real .docx (that is a zip of XML parts and would
 * need a library). Word, LibreOffice and Google Docs all open it; the honest
 * name for what this produces is "a Word document", and that is what the user is
 * offered.
 */
export const downloadNotesWord = async (notes, { title: named, sources = SOURCE_STYLES.footnotes } = {}) => {
  const { safeFileBaseName } = await import("./hebrewPdf");
  const { single, title, base } = documentNames(notes, named);

  const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const registry = createSourceRegistry();

  const body = notes.map((note) => {
    // A single note needs no heading — the document title is already its own —
    // and repeating it would print the same line twice.
    const heading = single ? "" : `<h2>${escape(headingFor(note))}</h2>`;
    // Through the same conversion the editor uses, so a note written before the
    // toolbar existed exports with its line breaks instead of as one paragraph,
    // and nothing unsafe rides along into the file. The chips inside it then
    // become footnote references, which is the only way to get something to the
    // foot of a PAGE out of HTML — see utilities/noteFootnotes.js.
    return `${heading}<div>${noteHtmlWithSources(noteBodyToHtml(note.body), registry, sources)}</div>`;
  }).join("<br>");

  // The office namespaces are what make Word treat this as its own document
  // rather than as a web page it happens to be able to read. dir=rtl and the
  // charset are what keep the Hebrew the right way round and unmangled.
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>${escape(title)}</title>
<style>
  body { font-family: Arial, sans-serif; direction: rtl; }
  h1 { font-size: 20pt; }
  h2 { font-size: 14pt; }
  img { max-width: 100%; }
  /* The apparatus. A source cannot be clicked on paper, so on the way in it
     stops being an inline chip and becomes a numbered reference against a
     footnote at the bottom of the page — in the blue the notebook already uses
     for a source. MsoFootnoteText is Word's own class name: styling it here is
     what carries the colour through into the rebuilt footnote. */
  span.MsoFootnoteReference { color: #1565c0; vertical-align: super; font-size: 9pt; }
  p.MsoFootnoteText { color: #1565c0; font-size: 9pt; }
  /* A source chip, kept whole. This is what makes "the source as it appears in
     the card" true rather than approximate: the same element, carrying the same
     accent for the same kind of lecture — orange for video, blue for audio,
     green for text — and its second line, the words written at that second,
     under the first. A chip with no type recorded keeps the neutral blue.

     These also catch a chip that survived unconverted, one whose lecture id did
     not outlast sanitizing, which still has to read as something. */
  span[data-media-id] { background: #1976d2; color: #ffffff; padding: 1pt 4pt; border-radius: 3pt; font-weight: bold; }
  span[data-media-type="video"] { background: #ef6c00; }
  span[data-media-type="audio"] { background: #1976d2; }
  span[data-media-type="text"] { background: #2e7d32; }
  span[data-chip-line="note"] { display: block; font-weight: normal; }
</style>
</head>
<body dir="rtl">
<h1>${escape(title)}</h1>
${body}
${wordFootnoteList(registry, sources)}
</body>
</html>`;

  // The BOM is not decoration: without it Word reads the file in the system
  // codepage and every Hebrew letter arrives as mojibake.
  saveBlob(
    new Blob(["﻿", html], { type: "application/msword;charset=utf-8" }),
    `${safeFileBaseName(base, "המחברת שלי")}.doc`
  );
};

// Long enough for the browser to treat the next download as a separate one.
//
// Chrome and Edge count downloads started from a single user gesture and, past
// the first, ask "allow multiple downloads?" — or, when the tab is not focused,
// drop them silently. Spacing them out is what makes three notebooks arrive as
// three files instead of one file and a prompt about the other two.
const BETWEEN_FILES_MS = 500;

/**
 * Write several documents, one per notebook, in order.
 *
 * The notebooks are the user's own division of a selection — "these notes to
 * one file, those to another" — so each is a complete document with its own
 * name, and nothing about them is inferred here. Empty ones are skipped: a file
 * containing no notes is not a smaller export, it is a puzzle in the downloads
 * folder.
 *
 * Sequential rather than Promise.all, and not only for the pacing above: the
 * PDF writer loads a Hebrew font and the bidi tables on first use, and three
 * parallel calls would race three copies of that import.
 */
export const downloadNotebooks = async (books, write) => {
  const filled = books.filter((book) => book.notes.length > 0);

  for (const [index, book] of filled.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, BETWEEN_FILES_MS));
    await write(book.notes, { title: book.name });
  }
  return filled.length;
};
