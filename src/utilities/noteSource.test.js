// @vitest-environment jsdom
import { test, expect, describe } from "vitest";
import { bookmarkDragPayload, sourceFootnoteLabel } from "./noteSource";

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
