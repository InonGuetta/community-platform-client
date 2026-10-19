// @vitest-environment jsdom
import { test, expect, describe } from "vitest";
import {
  bookmarkDragPayload, sourceFootnoteLabel, sourceChipHtml, sourceFromChip, isNoteAboutMedia,
  renameSourceChip, GENERAL_REFERENCE_LABEL, MAX_CHIP_NOTE,
  appendToReferences, hasWrittenText, referencesBlockHtml, REFERENCES_SELECTOR,
  bookmarkNames, syncChipNames,
} from "./noteSource";

// What the sidebar hands to a note when a bookmark is dragged into it, and what
// the export prints at the foot of the page. Both were written when a bookmark
// could only be a moment in a recording, and both had to learn the other anchor.

describe("what a dragged bookmark carries", () => {
  test("a recording carries its second, and no paragraph", () => {
    expect(bookmarkDragPayload(
      { media_id: 12, timestamp_seconds: 742, note: "כאן", media_type: "audio" },
      "בבא קמא ב"
    )).toEqual({
      mediaId: 12,
      // No bookmark behind it, so no id: a chip that is only a copy.
      bookmarkId: null,
      timestampSeconds: 742,
      chunkId: null,
      pageNumber: null,
      mediaTitle: "בבא קמא ב",
      note: "כאן",
      mediaType: "audio",
    });
  });

  // Without these the chip arrived with no anchor at all, and the reference it
  // left in the note could open the book but not the place.
  test("a passage carries its paragraph and its page", () => {
    const payload = bookmarkDragPayload(
      {
        media_id: 9, timestamp_seconds: null, chunk_id: 55, page_number: 47,
        note: "יסוד הסוגיה", media_type: "text",
      },
      "שערי תשובה"
    );
    expect(payload.chunkId).toBe(55);
    expect(payload.pageNumber).toBe(47);
    expect(payload.timestampSeconds).toBeNull();
  });

  // Both halves are always present and one is always null, which is the shape
  // the bookmark row itself has. A payload that dropped the null half would make
  // a text bookmark arrive looking like a recording with no timestamp.
  test("both anchors are named even when only one is filled", () => {
    const payload = bookmarkDragPayload({ media_id: 9, chunk_id: 55 }, "ספר");
    expect("timestampSeconds" in payload).toBe(true);
    expect("chunkId" in payload).toBe(true);
  });
});

describe("how a source reads at the foot of the page", () => {
  test("a recording is cited by minute", () => {
    expect(sourceFootnoteLabel({ mediaTitle: "בבא קמא ב", note: "כאן", timestampSeconds: 742 }))
      .toBe("בבא קמא ב · כאן · 12:22");
  });

  // The page is the unit somebody actually looks a passage up by, and a book
  // cited by timestamp would read "0:00" for every reference in the document.
  test("a sefer is cited by page, and never by a minute as well", () => {
    const label = sourceFootnoteLabel({
      mediaTitle: "שערי תשובה", note: "יסוד הסוגיה", timestampSeconds: null, pageNumber: 47,
    });
    expect(label).toBe("שערי תשובה · יסוד הסוגיה · עמ׳ 47");
    expect(label).not.toContain("0:00");
  });

  test("a document with no pages is cited by name alone", () => {
    expect(sourceFootnoteLabel({ mediaTitle: "קובץ", note: "כאן", timestampSeconds: null, pageNumber: null }))
      .toBe("קובץ · כאן");
  });
});

describe("which notes belong to a lesson", () => {
  test("a note taken on the lesson belongs to it", () => {
    expect(isNoteAboutMedia({ media_id: 49, body: "" }, 49)).toBe(true);
  });

  test("an id that arrived as a route param still matches", () => {
    expect(isNoteAboutMedia({ media_id: 49, body: "" }, "49")).toBe(true);
  });

  test("a note elsewhere that quotes the lesson in a chip belongs to it", () => {
    const body = `<p>ראה ${sourceChipHtml({ mediaId: 49, timestampSeconds: 120, mediaTitle: "שיחה" })}</p>`;
    expect(isNoteAboutMedia({ media_id: null, body }, 49)).toBe(true);
  });

  test("a chip for lesson 49 does not make the note about lesson 4", () => {
    const body = sourceChipHtml({ mediaId: 49, timestampSeconds: 0, mediaTitle: "שיחה" });
    expect(isNoteAboutMedia({ media_id: null, body }, 4)).toBe(false);
  });

  test("an unrelated note, a legacy plain-text body, or no id at all", () => {
    expect(isNoteAboutMedia({ media_id: 3, body: "טקסט רגיל" }, 49)).toBe(false);
    expect(isNoteAboutMedia({ media_id: null, body: null }, 49)).toBe(false);
    expect(isNoteAboutMedia({ media_id: 49 }, undefined)).toBe(false);
    expect(isNoteAboutMedia(null, 49)).toBe(false);
  });
});

describe("renaming a chip", () => {
  const chipFrom = (html) => {
    const host = document.createElement("div");
    host.innerHTML = html;
    return host.querySelector("span[data-media-id]");
  };

  test("a new note's reference starts as the general one", () => {
    const chip = chipFrom(sourceChipHtml({
      mediaId: 49, timestampSeconds: 125, mediaTitle: "שיחה", note: GENERAL_REFERENCE_LABEL,
    }));
    expect(sourceFromChip(chip)).toMatchObject({ mediaId: 49, timestampSeconds: 125, note: "הפנייה כללית" });
  });

  test("replaces the name in both the attribute and the visible line", () => {
    const chip = chipFrom(sourceChipHtml({ mediaId: 49, pageNumber: 14, mediaTitle: "תורה תמימה", note: GENERAL_REFERENCE_LABEL }));
    expect(renameSourceChip(chip, "  פירוש רש״י  ")).toBe(true);
    expect(chip.getAttribute("data-note")).toBe("פירוש רש״י");
    expect(chip.querySelector('span[data-chip-line="note"]').textContent).toBe("פירוש רש״י");
    // Where it points is untouched.
    expect(sourceFromChip(chip)).toMatchObject({ mediaId: 49, pageNumber: 14, note: "פירוש רש״י" });
  });

  test("gives a chip with no name its second line", () => {
    const chip = chipFrom(sourceChipHtml({ mediaId: 49, timestampSeconds: 5, mediaTitle: "שיחה" }));
    renameSourceChip(chip, "פתיחה");
    expect(chip.querySelectorAll('span[data-chip-line="note"]')).toHaveLength(1);
    expect(sourceFromChip(chip).note).toBe("פתיחה");
  });

  test("an empty name removes the line instead of leaving it blank", () => {
    const chip = chipFrom(sourceChipHtml({ mediaId: 49, timestampSeconds: 5, mediaTitle: "שיחה", note: "ישן" }));
    renameSourceChip(chip, "   ");
    expect(chip.hasAttribute("data-note")).toBe(false);
    expect(chip.querySelector('span[data-chip-line="note"]')).toBe(null);
    expect(chip.querySelector("br")).toBe(null);
  });

  test("a long name is kept whole in the attribute, shortened on the chip", () => {
    const chip = chipFrom(sourceChipHtml({ mediaId: 49, timestampSeconds: 5, mediaTitle: "שיחה" }));
    const long = "א".repeat(200);
    renameSourceChip(chip, long);
    expect(chip.getAttribute("data-note")).toHaveLength(MAX_CHIP_NOTE);
    expect(chip.querySelector('span[data-chip-line="note"]').textContent.endsWith("…")).toBe(true);
  });

  test("refuses anything that is not a chip", () => {
    expect(renameSourceChip(document.createElement("span"), "x")).toBe(false);
    expect(renameSourceChip(null, "x")).toBe(false);
  });
});

describe("the references line at the foot of a note", () => {
  const editorWith = (html) => {
    const editor = document.createElement("div");
    editor.innerHTML = html;
    return editor;
  };
  const chip = (id) => sourceChipHtml({ mediaId: id, timestampSeconds: 60, mediaTitle: `שיעור ${id}` });
  const chipIds = (node) => [...node.querySelectorAll("span[data-media-id]")].map((c) => c.getAttribute("data-media-id"));

  test("an empty note gets a line to write on, and the reference under it", () => {
    const editor = editorWith("");
    const writeHere = appendToReferences(editor, chip(1));
    expect(editor.children).toHaveLength(2);
    expect(editor.firstElementChild).toBe(writeHere);
    expect(hasWrittenText(writeHere)).toBe(false);
    expect(editor.lastElementChild.matches(REFERENCES_SELECTOR)).toBe(true);
    expect(chipIds(editor.lastElementChild)).toEqual(["1"]);
  });

  test("an empty note that already had a chip loose in it gathers it onto the line", () => {
    const editor = editorWith(`<p>${chip(1)}</p>`);
    appendToReferences(editor, chip(2));
    expect(chipIds(editor.querySelector(REFERENCES_SELECTOR))).toEqual(["1", "2"]);
    expect(editor.querySelectorAll("span[data-media-id]")).toHaveLength(2);
  });

  test("a second reference joins the first, at the end", () => {
    const editor = editorWith(`<p>טקסט</p>${referencesBlockHtml(chip(1))}`);
    expect(appendToReferences(editor, chip(2))).toBe(null);
    expect(editor.querySelectorAll(REFERENCES_SELECTOR)).toHaveLength(1);
    expect(chipIds(editor.querySelector(REFERENCES_SELECTOR))).toEqual(["1", "2"]);
  });

  test("a written note keeps its writing, and the line goes after it", () => {
    const editor = editorWith("<p>שורה ראשונה</p><p>שורה שנייה</p>");
    expect(appendToReferences(editor, chip(3))).toBe(null);
    expect(editor.children[0].textContent).toBe("שורה ראשונה");
    expect(editor.children[1].textContent).toBe("שורה שנייה");
    expect(editor.lastElementChild.matches(REFERENCES_SELECTOR)).toBe(true);
  });

  test("an old plain-text note is wrapped so its line breaks survive the pinning", () => {
    const editor = editorWith("שורה א<br>שורה ב");
    appendToReferences(editor, chip(4));
    expect(editor.firstElementChild.tagName).toBe("DIV");
    expect(editor.firstElementChild.innerHTML).toBe("שורה א<br>שורה ב");
    expect([...editor.childNodes].every((n) => n.nodeType === 1)).toBe(true);
  });

  test("writing is what counts as text — a chip's own label is not", () => {
    expect(hasWrittenText(editorWith(`<p>${chip(1)}</p>`))).toBe(false);
    expect(hasWrittenText(editorWith("<p>&nbsp;\u200B</p>"))).toBe(false);
    expect(hasWrittenText(editorWith(`<p>ראה ${chip(1)}</p>`))).toBe(true);
  });
});

// A chip made from a bookmark IS that bookmark: it carries the id, and its name
// is the bookmark's current note wherever it is shown.
describe("a chip that is a bookmark", () => {
  const chipEl = (html) => {
    const host = document.createElement("div");
    host.innerHTML = html;
    return host.querySelector("span[data-media-id]");
  };
  const linked = (note = "הפנייה כללית") =>
    sourceChipHtml({ mediaId: 49, timestampSeconds: 125, mediaTitle: "שיחה", note, bookmarkId: 77 });

  test("carries the bookmark's id, and reads it back", () => {
    expect(sourceFromChip(chipEl(linked())).bookmarkId).toBe(77);
    expect(sourceFromChip(chipEl(sourceChipHtml({ mediaId: 49, mediaTitle: "x" }))).bookmarkId).toBe(null);
  });

  test("a dragged bookmark arrives as that bookmark, not a copy", () => {
    expect(bookmarkDragPayload({ id: 77, media_id: 49, timestamp_seconds: 5, note: "א" }, "שיחה").bookmarkId).toBe(77);
  });

  test("shows the bookmark's current name, in the attribute and on the chip", () => {
    const html = syncChipNames(`<p>${linked()}</p>`, bookmarkNames([{ id: 77, note: "פירוש רש״י" }]));
    const chip = chipEl(html);
    expect(chip.getAttribute("data-note")).toBe("פירוש רש״י");
    expect(chip.querySelector('span[data-chip-line="note"]').textContent).toBe("פירוש רש״י");
    // Where it points is not touched.
    expect(sourceFromChip(chip)).toMatchObject({ mediaId: 49, timestampSeconds: 125, bookmarkId: 77 });
  });

  test("a bookmark whose name was cleared clears the chip's", () => {
    const chip = chipEl(syncChipNames(linked(), bookmarkNames([{ id: 77, note: null }])));
    expect(chip.hasAttribute("data-note")).toBe(false);
  });

  // The saved name is the fallback: a deleted bookmark, or one this screen did
  // not load, must not wipe what the note says.
  test("keeps its saved name when its bookmark is not known here", () => {
    const html = `<p>${linked("שם שמור")}</p>`;
    expect(syncChipNames(html, bookmarkNames([{ id: 12, note: "אחר" }]))).toBe(html);
  });

  test("a chip with no bookmark behind it is never renamed", () => {
    const plain = sourceChipHtml({ mediaId: 49, timestampSeconds: 5, mediaTitle: "שיחה", note: "שלי" });
    expect(syncChipNames(plain, bookmarkNames([{ id: 77, note: "אחר" }]))).toBe(plain);
  });

  // So a caller can tell from the string alone whether anything changed.
  test("returns the very same string when every name is already current", () => {
    const html = `<p>${linked("שם")}</p>`;
    expect(syncChipNames(html, bookmarkNames([{ id: 77, note: "שם" }]))).toBe(html);
  });
});
