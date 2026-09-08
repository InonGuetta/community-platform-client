import { test, expect, describe } from "vitest";
import { continueReadingHref, openingPageFrom, PAGE_PARAM } from "./deepLink";

// One side writes the link, the other reads it, and they are in different
// corners of the application. A parameter renamed on one side raises nothing:
// the link is still well formed, the page still loads, and it simply opens at
// the beginning — which is exactly how this behaviour was missing to begin
// with. Both halves are tested here, against the same constants they share.

// ── Where "open in the lecture page" points ─────────────────────────────────
//
// The floating source window is a place people READ from: they follow a mark
// into a sefer and turn pages, or into a shiur and listen on. The link out
// carried the MARK's second — where the window opened, not where they got to.

describe("carrying the reader's place out of the source window", () => {
  const href = (over) => continueReadingHref({ mediaId: 20, ...over });

  test("a book carries the page being read", () => {
    expect(href({ isText: true, page: 70 })).toBe("/media/20?page=70");
  });

  // The bug. A book had nothing in the link at all, so a reader on page 70 of a
  // 547-page sefer pressed the button and landed back at the title page.
  test("and not the first page it happened to open at", () => {
    expect(href({ isText: true, page: 70 })).not.toBe("/media/20");
  });

  // Page 1 is where a book opens anyway: saying so adds a parameter that
  // changes nothing.
  test("page one is left out, because it is where the book opens", () => {
    expect(href({ isText: true, page: 1 })).toBe("/media/20");
  });

  // Before the document has been laid out there is no page to report, and a
  // page nobody has read is not a place.
  test("a document not yet opened carries no page", () => {
    expect(href({ isText: true, page: null })).toBe("/media/20");
    expect(href({ isText: true, page: undefined })).toBe("/media/20");
    expect(href({ isText: true, page: NaN })).toBe("/media/20");
  });

  test("a recording carries the second the playhead is at", () => {
    expect(href({ playedTo: 1534.8, bookmarkSeconds: 742 })).toBe("/media/20?t=1534");
  });

  // The other half of the same bug: following a mark at 12:22 and listening on
  // to 25:34 sent the reader back to 12:22.
  test("and not the second the mark it was opened from names", () => {
    expect(href({ playedTo: 1534, bookmarkSeconds: 742 })).not.toContain("t=742");
  });

  // 0 is what a source that has not been played reports. It is not "the reader
  // rewound to the start", so the mark is still the best answer.
  test("a recording that was never played falls back to its mark", () => {
    expect(href({ playedTo: 0, bookmarkSeconds: 742 })).toBe("/media/20?t=742");
  });

  test("and one with neither carries nothing", () => {
    expect(href({ playedTo: 0, bookmarkSeconds: 0 })).toBe("/media/20");
  });

  // A page on a recording, or a second on a book, would be a place in the wrong
  // coordinate space — the failure this whole area keeps producing.
  test("each kind carries only its own coordinate", () => {
    expect(href({ isText: true, page: 70, playedTo: 1534 })).toBe("/media/20?page=70");
    expect(href({ isText: false, page: 70, playedTo: 1534 })).toBe("/media/20?t=1534");
  });
});

// ── And the half that reads it back ─────────────────────────────────────────

describe("the page a link asks a document to open at", () => {
  const from = (query) => openingPageFrom(new URLSearchParams(query));

  test("is the page the link names", () => {
    expect(from("page=70")).toBe(70);
    expect(from("?page=547")).toBe(547);
  });

  // The two halves, against each other. This is the assertion that a rename on
  // one side cannot survive — everything else in this file tests one half alone.
  test("is exactly what the other half wrote", () => {
    const href = continueReadingHref({ mediaId: 20, isText: true, page: 70 });
    const query = href.slice(href.indexOf("?"));

    expect(query).toContain(PAGE_PARAM);
    expect(openingPageFrom(new URLSearchParams(query))).toBe(70);
  });

  // Page 1 is where the book opens anyway. Nowhere to send the reader is the
  // same answer as no parameter at all, and the caller should not have to know
  // the difference.
  test("page one is nowhere to send anybody", () => {
    expect(from("page=1")).toBeNull();
    expect(from("")).toBeNull();
  });

  // A page number is the one thing in this link a person is likely to edit by
  // hand, so none of these may become a scroll to somewhere unintended.
  test("nonsense is not a place", () => {
    expect(from("page=abc")).toBeNull();
    expect(from("page=0")).toBeNull();
    expect(from("page=-3")).toBeNull();
    expect(from("page=")).toBeNull();
    expect(from("page=%20")).toBeNull();
  });

  // Half a page cannot be scrolled to, and Number("70.5") is not an integer —
  // asserted because a floor() here would silently accept it instead.
  test("a fraction of a page is not a place either", () => {
    expect(from("page=70.5")).toBeNull();
  });

  test("a link with no parameters at all is handled, not thrown at", () => {
    expect(openingPageFrom(null)).toBeNull();
    expect(openingPageFrom(undefined)).toBeNull();
  });
});
