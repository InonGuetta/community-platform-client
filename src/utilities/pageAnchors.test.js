// @vitest-environment jsdom
import { test, expect, describe } from "vitest";
import {
  rectWithin, pageAnchorFromSelection, scrollTopForMark, MAX_QUOTE_CHARS,
} from "./pageAnchors";

// Turning a selection on a rendered page into a place that can be stored.
//
// The arithmetic is the part worth testing hard: an error here is a mark drawn
// somewhere the reader did not put it, which looks like a working feature and is
// not. jsdom lays nothing out, so the geometry is staged — which is the only way
// to cover this at all, and the alternative is a rule nothing checks.

const rect = (left, top, width, height) => ({
  left, top, width, height, right: left + width, bottom: top + height,
});

// A page 600x800 sitting at (100, 50) on the screen.
const PAGE = rect(100, 50, 600, 800);

describe("a rectangle expressed as fractions of its page", () => {
  test("the top-left corner of the page is the origin", () => {
    expect(rectWithin(rect(100, 50, 60, 80), PAGE)).toEqual({ x: 0, y: 0, w: 0.1, h: 0.1 });
  });

  test("a line partway down reads as its share of the page", () => {
    // 300px across starting halfway, 16px tall a quarter of the way down.
    expect(rectWithin(rect(400, 250, 300, 16), PAGE)).toEqual({
      x: 0.5, y: 0.25, w: 0.5, h: 0.02,
    });
  });

  // Pixels are measured at whatever zoom the reader had. The same line at twice
  // the size has to produce the same numbers, or a mark moves when the reader
  // zooms — or opens the book on their phone.
  test("zoom does not change the answer", () => {
    const atOne = rectWithin(rect(400, 250, 300, 16), PAGE);
    const doubled = rectWithin(rect(700, 450, 600, 32), rect(100, 50, 1200, 1600));
    expect(doubled).toEqual(atOne);
  });

  // A selection can legitimately begin on one page and end on the next. The
  // honest answer for the first page is "everything from here down".
  test("a selection running off the page is clipped to it", () => {
    const spilling = rectWithin(rect(100, 650, 600, 400), PAGE);
    expect(spilling.y + spilling.h).toBeCloseTo(1, 5);
    expect(spilling.h).toBeCloseTo(0.25, 5);
  });

  test("one starting above the page does not report a width reaching back past its start", () => {
    const above = rectWithin(rect(-200, -100, 500, 200), PAGE);
    expect(above.x).toBe(0);
    expect(above.y).toBe(0);
    expect(above.w).toBeGreaterThan(0);
  });

  // No area is no mark: it cannot be drawn, so it could never be found again.
  test("a rectangle with no area is not a place", () => {
    expect(rectWithin(rect(200, 200, 0, 16), PAGE)).toBeNull();
    expect(rectWithin(rect(200, 200, 100, 0), PAGE)).toBeNull();
  });

  // What a getBoundingClientRect returns before the browser has laid anything
  // out — which in a virtualised viewer is a page that has not drawn yet.
  test("a page with no size yields nothing rather than dividing by zero", () => {
    expect(rectWithin(rect(0, 0, 10, 10), rect(0, 0, 0, 0))).toBeNull();
    expect(rectWithin(null, PAGE)).toBeNull();
    expect(rectWithin(rect(0, 0, 10, 10), null)).toBeNull();
  });

  test("every side stays inside the page", () => {
    const clipped = rectWithin(rect(-500, -500, 5000, 5000), PAGE);
    for (const side of ["x", "y", "w", "h"]) {
      expect(clipped[side]).toBeGreaterThanOrEqual(0);
      expect(clipped[side]).toBeLessThanOrEqual(1);
    }
  });
});

// ── Going back to a mark ────────────────────────────────────────────────────
//
// The other half of the feature, and the half that was broken in the notebook:
// the window opened on page 1 of 547 with the chip beside it reading "עמ׳ 14".
// The cause was WHEN the viewer asked (before the document was laid out), but
// the arithmetic is what decides where it lands, and it lives here so that it
// can be checked at all.

describe("where to scroll to reach a mark", () => {
  // A page 800 tall, sitting 11,200 into the scrolled content — page 15 of a
  // sefer, in a box 600 high.
  const PAGE_TOP = 11200;

  test("a bookmark that names only a page opens at the top of it", () => {
    expect(scrollTopForMark({ pageTop: PAGE_TOP, pageHeight: 800, boxHeight: 600 }))
      .toBe(PAGE_TOP);
  });

  // Centred, not pinned to the top edge: a mark at the very top of a scrolling
  // box reads as the start of something rather than as the thing pointed at.
  test("a mark on the page is centred in the box", () => {
    const top = scrollTopForMark({
      pageTop: PAGE_TOP, pageHeight: 800, boxHeight: 600,
      rect: { y: 0.5, h: 0.02 },
    });
    // The mark sits at 11200 + 400; centring puts it 300 from the box's top.
    expect(top).toBe(11200 + 400 - 300 + 8);
  });

  // The first lines of the first page: centring would ask for a negative scroll,
  // and the honest answer is the top of the document.
  test("a mark near the very beginning does not scroll above the document", () => {
    expect(scrollTopForMark({
      pageTop: 0, pageHeight: 800, boxHeight: 600, rect: { y: 0.01, h: 0.02 },
    })).toBe(0);
  });

  // The bug this was extracted to prevent. A page whose height is not known yet
  // is a page whose position is a guess, and a guess here is a bookmark that
  // lands somewhere the reader did not put it.
  test("an unmeasured page yields nothing rather than a wrong number", () => {
    expect(scrollTopForMark({ pageTop: PAGE_TOP, pageHeight: 0, boxHeight: 600 })).toBeNull();
    expect(scrollTopForMark({ pageTop: NaN, pageHeight: 800, boxHeight: 600 })).toBeNull();
    expect(scrollTopForMark({ pageTop: PAGE_TOP, pageHeight: NaN, boxHeight: 600 })).toBeNull();
  });

  // A rect stored as REAL comes back from some drivers as a string. The mark has
  // to land in the same place either way.
  test("the rectangle's numbers may arrive as strings", () => {
    const asNumbers = scrollTopForMark({
      pageTop: PAGE_TOP, pageHeight: 800, boxHeight: 600, rect: { y: 0.25, h: 0.02 },
    });
    const asStrings = scrollTopForMark({
      pageTop: PAGE_TOP, pageHeight: 800, boxHeight: 600, rect: { y: "0.25", h: "0.02" },
    });
    expect(asStrings).toBe(asNumbers);
  });

  // Zoom changes every page's height. The same mark has to stay the same LINE,
  // which it does because the rect is a fraction of whatever height it is given.
  //
  // Asserted by undoing the centring and asking how far down its own page the
  // mark ended up. Comparing the two scroll positions directly does not work:
  // the box is 600 high at either zoom, so the centring offset is the one term
  // in the sum that does not scale.
  test("the mark stays on its line at any zoom", () => {
    const markTopInPage = ({ pageTop, pageHeight }) => {
      const scrollTop = scrollTopForMark({
        pageTop, pageHeight, boxHeight: 600, rect: { y: 0.5, h: 0.02 },
      });
      return scrollTop + 600 / 2 - (0.02 * pageHeight) / 2 - pageTop;
    };

    expect(markTopInPage({ pageTop: 800, pageHeight: 800 })).toBe(400);
    expect(markTopInPage({ pageTop: 1600, pageHeight: 1600 })).toBe(800);
  });

  // A rect missing its height is not a reason to refuse: the position is the
  // part that matters, and half of nothing is nothing.
  test("a rect with no height still points at its line", () => {
    expect(scrollTopForMark({
      pageTop: PAGE_TOP, pageHeight: 800, boxHeight: 600, rect: { y: 0.5 },
    })).toBe(11200 + 400 - 300);
  });
});

// ── The DOM half ────────────────────────────────────────────────────────────

const stagePage = (number, box = PAGE) => {
  const el = document.createElement("div");
  el.setAttribute("data-pdf-page", String(number));
  const span = document.createElement("span");
  span.textContent = "בָּעֵת הַהִוא לֵאמֹר";
  el.appendChild(span);
  document.body.appendChild(el);
  el.getBoundingClientRect = () => box;
  return { el, span };
};

const selectionOver = (node, targetRect, endNode = node) => {
  const range = document.createRange();
  range.selectNodeContents(node);
  range.getBoundingClientRect = () => targetRect;
  Object.defineProperty(range, "endContainer", { value: endNode, configurable: true });
  return {
    isCollapsed: false,
    rangeCount: 1,
    getRangeAt: () => range,
    toString: () => node.textContent,
  };
};

describe("reading a selection off a page", () => {
  test("the page it was made on answers, by its own number", () => {
    const { span } = stagePage(9);
    const anchor = pageAnchorFromSelection(selectionOver(span, rect(400, 250, 300, 16)));
    expect(anchor.pageNumber).toBe(9);
    expect(anchor.rect).toEqual({ x: 0.5, y: 0.25, w: 0.5, h: 0.02 });
  });

  // The OCR in this archive misreads freely. The words are kept as a LABEL for
  // the list, and the mark is found again by geometry regardless of them.
  test("the words are kept however badly they were read", () => {
    const { span } = stagePage(9);
    span.textContent = "בּ עֵ ת הַ הִ וא לֵ אמֹ ר";
    const anchor = pageAnchorFromSelection(selectionOver(span, rect(400, 250, 300, 16)));
    expect(anchor.text).toBe("בּ עֵ ת הַ הִ וא לֵ אמֹ ר");
  });

  test("a very long selection keeps its place and abridges only its label", () => {
    const { span } = stagePage(9);
    span.textContent = "א".repeat(1000);
    const anchor = pageAnchorFromSelection(selectionOver(span, rect(100, 50, 600, 700)));
    expect(anchor.text.length).toBeLessThanOrEqual(MAX_QUOTE_CHARS + 1);
    expect(anchor.text.endsWith("…")).toBe(true);
    expect(anchor.rect.h).toBeCloseTo(0.875, 3);
  });

  test("a collapsed selection is not a mark", () => {
    stagePage(9);
    expect(pageAnchorFromSelection({ isCollapsed: true, rangeCount: 1 })).toBeNull();
    expect(pageAnchorFromSelection(null)).toBeNull();
  });

  // The toolbar, the note panel, anything outside the pages themselves.
  test("a selection that is not on a page at all is not a mark", () => {
    const stray = document.createElement("p");
    stray.textContent = "לא על עמוד";
    document.body.appendChild(stray);
    expect(pageAnchorFromSelection(selectionOver(stray, rect(0, 0, 10, 10)))).toBeNull();
  });

  // A drag beginning on page nine belongs to page nine. Answering for the page it
  // ended on would file the mark somewhere the reader was not looking.
  test("a selection crossing into the next page stays with the one it started on", () => {
    const first = stagePage(9);
    const second = stagePage(10, rect(100, 900, 600, 800));

    const anchor = pageAnchorFromSelection(
      selectionOver(first.span, rect(100, 700, 600, 400), second.span)
    );
    expect(anchor.pageNumber).toBe(9);
    expect(anchor.truncated).toBe(true);
    expect(anchor.rect.y + anchor.rect.h).toBeCloseTo(1, 5);
  });

  test("one that stays on its page is not reported as truncated", () => {
    const { span } = stagePage(9);
    expect(pageAnchorFromSelection(selectionOver(span, rect(400, 250, 300, 16))).truncated).toBe(false);
  });
});
