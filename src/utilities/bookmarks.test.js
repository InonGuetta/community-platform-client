import { test, expect, describe } from "vitest";
import {
  isTextBookmark,
  isOrphaned,
  compareBookmarks,
  inReadingOrder,
  placeLabel,
  placeShortLabel,
  bookmarkLines,
  isPageBookmark,
  pageMarksFor,
} from "./bookmarks";

// The cases in the first block were carried by bookAnchors.test.js, which held a
// TRANSCRIPTION of the rule rather than an import of it — with a header saying so
// and asking to be kept in step by hand. They are here now, importing the one
// definition, which is the whole point of that file having been retired.

describe("telling the two kinds of bookmark apart", () => {
  test("a bookmark with an offset is a text bookmark", () => {
    expect(isTextBookmark({ char_position: 4200, timestamp_seconds: null })).toBe(true);
  });

  test("a bookmark with a timestamp is not", () => {
    expect(isTextBookmark({ char_position: null, timestamp_seconds: 754 })).toBe(false);
  });

  // The two values most easily mistaken for "absent". Offset 0 is the start of a
  // book; timestamp 0 is the start of a recording. Both are real.
  test("offset zero still counts as a text bookmark", () => {
    expect(isTextBookmark({ char_position: 0, timestamp_seconds: null })).toBe(true);
  });

  test("timestamp zero is not mistaken for a text bookmark", () => {
    expect(isTextBookmark({ char_position: null, timestamp_seconds: 0 })).toBe(false);
  });

  test("an old row with no char_position column at all reads as a recording", () => {
    expect(isTextBookmark({ timestamp_seconds: 12 })).toBe(false);
  });
});

describe("a bookmark that outlived its paragraph", () => {
  test("a text bookmark with no chunk is orphaned", () => {
    expect(isOrphaned({ char_position: 4200, chunk_id: null })).toBe(true);
  });

  test("one that still names a chunk is not", () => {
    expect(isOrphaned({ char_position: 4200, chunk_id: 55 })).toBe(false);
  });

  // A recording's bookmark has no chunk and never did. Calling it orphaned would
  // put "המיקום אינו זמין עוד" on every bookmark in every lecture.
  test("a recording's bookmark is not orphaned", () => {
    expect(isOrphaned({ timestamp_seconds: 754, char_position: null })).toBe(false);
  });
});

describe("reading order", () => {
  // The bug this function exists for. timestamp_seconds is NULL on every one of
  // these, so subtracting produced NaN and left the order unspecified — in three
  // separate places, none of which reported anything.
  test("a book's bookmarks sort by position, not by a timestamp they lack", () => {
    const sorted = inReadingOrder([
      { id: 3, char_position: 900, timestamp_seconds: null },
      { id: 1, char_position: 10, timestamp_seconds: null },
      { id: 2, char_position: 400, timestamp_seconds: null },
    ]);
    expect(sorted.map((b) => b.id)).toEqual([1, 2, 3]);
  });

  test("a recording's bookmarks still sort by second", () => {
    const sorted = inReadingOrder([
      { id: 2, timestamp_seconds: 754, char_position: null },
      { id: 1, timestamp_seconds: 12, char_position: null },
    ]);
    expect(sorted.map((b) => b.id)).toEqual([1, 2]);
  });

  test("offset zero sorts first rather than being read as absent", () => {
    const sorted = inReadingOrder([
      { id: 2, char_position: 5, timestamp_seconds: null },
      { id: 1, char_position: 0, timestamp_seconds: null },
    ]);
    expect(sorted.map((b) => b.id)).toEqual([1, 2]);
  });

  // Only the notebook holds both kinds at once. The requirement is not that one
  // kind wins but that the answer is the same every time — an order that depends
  // on the arrival sequence makes the list appear to reshuffle itself.
  test("a mixed list is ordered deterministically, each kind among its own", () => {
    const mixed = [
      { id: 4, char_position: 900, timestamp_seconds: null },
      { id: 2, timestamp_seconds: 754, char_position: null },
      { id: 3, char_position: 10, timestamp_seconds: null },
      { id: 1, timestamp_seconds: 12, char_position: null },
    ];
    expect(inReadingOrder(mixed).map((b) => b.id)).toEqual([1, 2, 3, 4]);
    expect(inReadingOrder([...mixed].reverse()).map((b) => b.id)).toEqual([1, 2, 3, 4]);
  });

  test("sorting does not disturb the array it was given", () => {
    const original = [{ id: 2, char_position: 5 }, { id: 1, char_position: 1 }];
    inReadingOrder(original);
    expect(original.map((b) => b.id)).toEqual([2, 1]);
  });

  test("the comparator is usable on its own", () => {
    expect(compareBookmarks({ char_position: 1 }, { char_position: 2 })).toBeLessThan(0);
  });
});

describe("where a bookmark says it is", () => {
  test("a recording reads as a time", () => {
    expect(placeLabel({ timestamp_seconds: 754, char_position: null })).toBe("בזמן 12:34");
  });

  // formatTime(null) is "0:00", which is how every bookmark in every sefer came
  // to be labelled with a timestamp it does not have.
  test("a book never reads as a time", () => {
    expect(placeLabel({ char_position: 4200, chunk_id: 55 })).not.toContain("בזמן");
    expect(placeLabel({ char_position: 4200, chunk_id: 55 })).not.toContain("0:00");
  });

  test("a page is used when the extractor could derive one", () => {
    expect(placeLabel({ char_position: 4200, chunk_id: 55, page_number: 47 })).toBe("עמ׳ 47");
  });

  // .txt and .docx have no pages, and neither does a PDF whose boundaries could
  // not be derived safely. Inventing "עמ׳ 1" would make the citation meaningless
  // exactly where it is meant to be useful.
  test("no page number is said plainly rather than made up", () => {
    expect(placeLabel({ char_position: 4200, chunk_id: 55, page_number: null })).toBe("במיקום בטקסט");
  });

  test("an orphaned bookmark says its place is gone", () => {
    expect(placeLabel({ char_position: 4200, chunk_id: null, page_number: 47 })).toBe("המיקום אינו זמין עוד");
  });
});

describe("what the row reads", () => {
  test("the user's own words are the title when there are any", () => {
    const { title } = bookmarkLines({ char_position: 1, chunk_id: 5, note: "יסוד הסוגיה", quoted_text: "ואמר רבי" });
    expect(title).toBe("יסוד הסוגיה");
  });

  // "(ללא הערה)" on every row is a list nobody can read, which is what a book's
  // bookmarks looked like before a passage carried its text.
  test("the marked passage stands in when nothing was written", () => {
    const { title } = bookmarkLines({ char_position: 1, chunk_id: 5, quoted_text: "ואמר רבי" });
    expect(title).toBe("ואמר רבי");
  });

  test("a bookmark with neither still says something", () => {
    expect(bookmarkLines({ timestamp_seconds: 30 }).title).toBe("(ללא הערה)");
  });

  test("the second line carries the quote and the page together", () => {
    const { detail } = bookmarkLines({
      char_position: 1, chunk_id: 5, page_number: 12, note: "יסוד", quoted_text: "ואמר רבי",
    });
    expect(detail).toBe("„ואמר רבי” · עמ׳ 12");
  });

  // Otherwise the same words appear twice, once per line.
  test("the quote is not repeated when it is already the title", () => {
    const { detail } = bookmarkLines({ char_position: 1, chunk_id: 5, page_number: 12, quoted_text: "ואמר רבי" });
    expect(detail).toBe("עמ׳ 12");
  });

  test("a recording's row reads as it always did", () => {
    expect(bookmarkLines({ timestamp_seconds: 754, char_position: null, note: "כאן" }))
      .toEqual({ title: "כאן", detail: "בזמן 12:34" });
  });
});

// The notebook's sidebar shows the place in a chip a few characters wide, where
// "בזמן 12:34" reads as noise and the number alone is the convention.
describe("the same place, sized for a chip", () => {
  test("a recording is the bare timestamp, as it always was", () => {
    expect(placeShortLabel({ timestamp_seconds: 754, char_position: null })).toBe("12:34");
  });

  // The bug: formatTime(null) is "0:00", so every bookmark in every sefer in the
  // notebook's sidebar wore a timestamp it does not have.
  test("a book never shows 0:00", () => {
    expect(placeShortLabel({ char_position: 4200, chunk_id: 55, page_number: 47 })).toBe("עמ׳ 47");
    expect(placeShortLabel({ char_position: 4200, chunk_id: 55 })).toBe("בטקסט");
    expect(placeShortLabel({ char_position: 0, chunk_id: 55 })).not.toContain("0:00");
  });

  test("an orphaned bookmark says so in the space available", () => {
    expect(placeShortLabel({ char_position: 4200, chunk_id: null })).toBe("לא זמין");
  });
});

// ── The third kind: a place on a page of the original file ──────────────────
//
// It has no char_position and no timestamp, so every question the other two
// answer had to learn about it — and the one that mattered most is the label,
// because falling through to the recording branch means formatTime(null), which
// is "0:00". That is the exact bug this module was written to fix, one anchor
// kind later.

const pageMark = {
  id: 7, media_id: 20, timestamp_seconds: null, char_position: null, chunk_id: null,
  page_number: 9, rect_x: 0.12, rect_y: 0.4315, rect_w: 0.63, rect_h: 0.021,
  quoted_text: "בָּעֵת הַהִוא לֵאמֹר", note: "כאן",
};

describe("telling a place on a page apart", () => {
  test("the rectangle is what says so, not the page", () => {
    expect(isPageBookmark(pageMark)).toBe(true);
    // A text bookmark carries a page too — as a citation copied from its chunk.
    expect(isPageBookmark({ char_position: 10, chunk_id: 5, page_number: 9 })).toBe(false);
    expect(isPageBookmark({ timestamp_seconds: 754 })).toBe(false);
  });

  test("it never reads as a time", () => {
    expect(placeLabel(pageMark)).toBe("עמ׳ 9");
    expect(placeLabel(pageMark)).not.toContain("0:00");
    expect(placeShortLabel(pageMark)).toBe("עמ׳ 9");
  });

  test("its words are its title, as they are everywhere else", () => {
    expect(bookmarkLines({ ...pageMark, note: null }).title).toBe("בָּעֵת הַהִוא לֵאמֹר");
    expect(bookmarkLines(pageMark).detail).toContain("עמ׳ 9");
  });

  // It owes nothing to the extracted text, so the pipeline cannot orphan it.
  test("it is never orphaned, chunk or no chunk", () => {
    expect(isOrphaned(pageMark)).toBe(false);
  });

  test("marks are sorted by page, in their own space", () => {
    const sorted = inReadingOrder([
      { ...pageMark, id: 2, page_number: 40 },
      { ...pageMark, id: 1, page_number: 9 },
    ]);
    expect(sorted.map((b) => b.id)).toEqual([1, 2]);
  });

  // The notebook holds all three at once. The requirement is not that one kind
  // wins but that the answer is the same every time.
  test("three kinds in one list order deterministically", () => {
    const mixed = [
      { id: 3, char_position: 900, timestamp_seconds: null },
      { ...pageMark, id: 2, page_number: 9 },
      { id: 1, timestamp_seconds: 12, char_position: null },
    ];
    expect(inReadingOrder(mixed).map((b) => b.id)).toEqual([1, 2, 3]);
    expect(inReadingOrder([...mixed].reverse()).map((b) => b.id)).toEqual([1, 2, 3]);
  });
});

describe("the marks to draw on a page", () => {
  test("only the ones belonging to that page", () => {
    const marks = pageMarksFor(9, [pageMark, { ...pageMark, id: 8, page_number: 10 }]);
    expect(marks).toEqual([{ id: 7, x: 0.12, y: 0.4315, w: 0.63, h: 0.021 }]);
  });

  test("a text bookmark citing the same page is not drawn on it", () => {
    expect(pageMarksFor(9, [{ id: 1, char_position: 10, chunk_id: 5, page_number: 9 }])).toEqual([]);
  });

  // Postgres REAL comes back through the driver as a string on some versions.
  test("sides that arrive as strings are still numbers", () => {
    const asText = { ...pageMark, rect_x: "0.12", rect_y: "0.4315", rect_w: "0.63", rect_h: "0.021" };
    expect(pageMarksFor(9, [asText])[0]).toEqual({ id: 7, x: 0.12, y: 0.4315, w: 0.63, h: 0.021 });
  });

  test("a page with nothing on it draws nothing", () => {
    expect(pageMarksFor(41, [pageMark])).toEqual([]);
    expect(pageMarksFor(9, [])).toEqual([]);
  });
});
