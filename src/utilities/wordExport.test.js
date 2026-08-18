// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { downloadNotesWord } from "./notesExport";
import { sourceChipHtml } from "./noteSource";
import { SOURCE_STYLES } from "./noteFootnotes";

// The document that actually reaches Word.
//
// What this CANNOT check is Word: whether it turns `mso-element:footnote` into
// a real footnote at the bottom of a page is a question about a program that is
// not here, and no test in this repository can answer it. What it can check —
// and what had nothing checking it — is that the file is a coherent document:
// that every reference has an entry, that every entry has a reference, that the
// two are linked by the ids Word matches them on, and that the mode which is
// supposed to leave the sources in place really leaves them in place.
//
// If Word ignores the footnote markup entirely, the list still renders as
// ordinary numbered lines at the end of the document, against numbered marks in
// the text. That is the fallback, and it is asserted here too.

let captured = null;

beforeEach(() => {
  captured = null;
  global.URL.createObjectURL = vi.fn((blob) => { captured = blob; return "blob:test"; });
  global.URL.revokeObjectURL = vi.fn();
});

const BOOKMARK = {
  mediaId: 12,
  timestampSeconds: 742,
  mediaTitle: "בבא קמא ב",
  note: "בעניין יתרו ומשה רבנו",
  mediaType: "video",
};

const notes = () => [{
  id: 1,
  title: "הערה",
  body: `<div>מה שנאמר ${sourceChipHtml(BOOKMARK)} הוא העיקר</div>`,
  updated_at: "2026-08-11T10:00:00Z",
}];

// jsdom's Blob has no text(), so the file is read the way a browser would read
// one it had been handed.
const readBlob = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsText(blob);
});

// The .doc is HTML with a BOM in front of it — see downloadNotesWord.
const documentOf = async (options) => {
  await downloadNotesWord(notes(), options);
  const raw = await readBlob(captured);
  const html = raw.replace(/^\uFEFF/, "");
  return { raw, html, dom: new DOMParser().parseFromString(html, "text/html") };
};

describe("the Word document, with footnotes", () => {
  test("every reference is linked to an entry, and every entry to a reference", async () => {
    const { dom } = await documentOf({ sources: SOURCE_STYLES.footnotes });

    const references = [...dom.querySelectorAll('a[name^="_ftnref"]')];
    const entries = [...dom.querySelectorAll('div[style*="mso-element:footnote"]:not([style*="footnote-list"])')];

    expect(references).toHaveLength(1);
    expect(entries).toHaveLength(1);

    // The ids Word pairs them on. A mismatch here is a document whose footnotes
    // point at nothing — which looks fine until it is opened.
    expect(references[0].getAttribute("href")).toBe("#_ftn1");
    expect(entries[0].getAttribute("id")).toBe("ftn1");
    expect(entries[0].querySelector("a").getAttribute("href")).toBe("#_ftnref1");
  });

  test("the entry says which lecture, which point in it, and when", async () => {
    const { dom } = await documentOf({ sources: SOURCE_STYLES.footnotes });
    const list = dom.querySelector('div[style*="footnote-list"]');

    expect(list.textContent).toContain("בבא קמא ב");
    expect(list.textContent).toContain("בעניין יתרו ומשה רבנו");
    expect(list.textContent).toContain("12:22");
  });

  // The fallback, for Word ignoring the mso attributes and for LibreOffice and
  // Google Docs, which do not implement them at all: a numbered mark in the
  // text against a numbered line at the end.
  test("the number is real text on both halves, not a field", async () => {
    const { dom } = await documentOf({ sources: SOURCE_STYLES.footnotes });

    expect(dom.querySelector('a[name^="_ftnref"]').textContent).toContain("[1]");
    expect(dom.querySelector('div[style*="footnote-list"]').textContent).toContain("[1]");
  });

  test("the chip itself is gone from the text — on paper it IS the footnote", async () => {
    const { dom } = await documentOf({ sources: SOURCE_STYLES.footnotes });
    const body = dom.querySelector("body");

    expect(body.querySelector("span[data-media-id]")).toBe(null);
    expect(body.textContent).toContain("מה שנאמר");
  });
});

describe("the Word document, with the sources left in place", () => {
  test("the chip survives whole, with its colour and its second line", async () => {
    const { dom, html } = await documentOf({ sources: SOURCE_STYLES.inline });

    const chip = dom.querySelector("span[data-media-id]");
    expect(chip).not.toBe(null);
    expect(chip.getAttribute("data-media-type")).toBe("video");
    expect(chip.querySelector('span[data-chip-line="note"]').textContent).toContain("בעניין יתרו");

    // The colour reaches it through the document's own stylesheet, which is the
    // only way a .doc can carry one.
    expect(html).toContain('span[data-media-type="video"]');
  });

  test("it is numbered where it stands", async () => {
    const { dom } = await documentOf({ sources: SOURCE_STYLES.inline });

    expect(dom.querySelector("span[data-media-id]").textContent).toContain("[1]");
  });

  test("and nothing is repeated at the end", async () => {
    const { dom } = await documentOf({ sources: SOURCE_STYLES.inline });

    expect(dom.querySelector('div[style*="footnote-list"]')).toBe(null);
    expect(dom.querySelector("a[name^='_ftnref']")).toBe(null);
  });
});

describe("the Word document, with no sources at all", () => {
  test("the writing is there and the references are not", async () => {
    const { dom } = await documentOf({ sources: SOURCE_STYLES.none });
    const body = dom.querySelector("body");

    expect(body.textContent).toContain("מה שנאמר");
    expect(body.textContent).toContain("הוא העיקר");
    expect(body.querySelector("span[data-media-id]")).toBe(null);
    expect(body.textContent).not.toContain("בבא קמא ב");
    expect(dom.querySelector('div[style*="footnote-list"]')).toBe(null);
  });
});

// The charset and the direction, which are what keep the Hebrew from arriving
// as mojibake read in the system codepage and laid out left to right.
test("the document declares itself as Hebrew, right to left, and as Word's own", async () => {
  const { html, dom } = await documentOf({ sources: SOURCE_STYLES.footnotes });

  expect(html).toContain('charset="utf-8"');
  expect(html).toContain("urn:schemas-microsoft-com:office:word");
  expect(dom.querySelector("body").getAttribute("dir")).toBe("rtl");
});

// Checked as BYTES, because decoding the blob as text consumes the very thing
// being asserted. Without these three in front of the file, Word reads it in
// the system codepage and every Hebrew letter arrives as mojibake — which is
// the kind of failure that looks like a corrupt export rather than a missing
// header.
test("the file begins with a UTF-8 byte-order mark", async () => {
  await downloadNotesWord(notes(), { sources: SOURCE_STYLES.footnotes });

  const bytes = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(captured);
  });

  expect([...bytes.slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF]);
});
