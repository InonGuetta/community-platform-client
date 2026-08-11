import { noteBodyToHtml, noteHtmlToPlainText } from "./noteHtml";

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
const documentNames = (notes) => {
  const single = notes.length === 1 ? notes[0] : null;
  const title = single ? (single.title?.trim() || "הערה ללא כותרת") : "המחברת שלי";
  return {
    single,
    title,
    base: single ? title : `המחברת שלי - ${new Date().toLocaleDateString("he-IL")}`,
  };
};

/**
 * Write the given notes to a PDF and hand it to the browser.
 *
 * `notes` arrives in the order the screen shows them, and that order is kept:
 * the export should read the way the notebook does, not the way the database
 * happened to return the rows.
 */
export const downloadNotesPdf = async (notes) => {
  const { downloadHebrewPdf, safeFileBaseName } = await import("./hebrewPdf");
  const { single, title, base } = documentNames(notes);

  await downloadHebrewPdf({
    title,
    // A single note needs no heading — the document title is already its own —
    // and repeating it would print the same line twice.
    sections: notes.map((note) => ({
      heading: single ? null : headingFor(note),
      text: noteHtmlToPlainText(note.body),
    })),
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
export const downloadNotesWord = async (notes) => {
  const { safeFileBaseName } = await import("./hebrewPdf");
  const { single, title, base } = documentNames(notes);

  const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const body = notes.map((note) => {
    // A single note needs no heading — the document title is already its own —
    // and repeating it would print the same line twice.
    const heading = single ? "" : `<h2>${escape(headingFor(note))}</h2>`;
    // Through the same conversion the editor uses, so a note written before the
    // toolbar existed exports with its line breaks instead of as one paragraph,
    // and nothing unsafe rides along into the file.
    return `${heading}<div>${noteBodyToHtml(note.body)}</div>`;
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
</style>
</head>
<body dir="rtl">
<h1>${escape(title)}</h1>
${body}
</body>
</html>`;

  // The BOM is not decoration: without it Word reads the file in the system
  // codepage and every Hebrew letter arrives as mojibake.
  saveBlob(
    new Blob(["﻿", html], { type: "application/msword;charset=utf-8" }),
    `${safeFileBaseName(base, "המחברת שלי")}.doc`
  );
};
