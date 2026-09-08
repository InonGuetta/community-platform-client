// Turning a selection on a rendered PDF page into something storable.
//
// ── Why geometry and not words ─────────────────────────────────────────────
//
// The other two anchors describe a moment in a recording and a passage in the
// EXTRACTED text. For a scanned sefer that extraction is a poor translation of
// the document — the OCR in this archive misreads freely — so a bookmark whose
// only anchor is those words can be found again only by searching for words that
// are wrong.
//
// This one records WHERE, not WHAT: a page, and a rectangle on it. Both come
// from the document's own structure, so the quality of the transcription stops
// mattering entirely rather than merely being bounded. The text is kept too, but
// as a LABEL for the list — never as the way back.
//
// ── Fractions, so the mark outlives the screen it was made on ──────────────
//
// A rectangle in pixels is measured at whatever zoom and column width the reader
// happened to have, and points somewhere else on every other screen — including
// their own phone. Expressed as fractions of the page it is a property of the
// document, and survives zoom, a different device and a browser update.

/**
 * A rectangle inside a page, as fractions of that page.
 *
 * Both arguments are DOMRect-shaped: the thing selected, and the page it was
 * selected on. Returns null when the numbers cannot describe anything — a page
 * with no size, which is what a rect reads as before layout has happened.
 *
 * Clamped into the page rather than rejected when it spills out. A selection can
 * legitimately begin on one page and end on the next, and the honest answer for
 * the first page is "everything from here down" rather than nothing at all.
 */
export const rectWithin = (target, page) => {
  if (!target || !page || !(page.width > 0) || !(page.height > 0)) return null;

  const clamp = (n) => Math.min(1, Math.max(0, n));
  // Rounded to five decimals: on a page 600 points wide that is a hundredth of a
  // point, far finer than a line of type, and it keeps the stored numbers short.
  const round = (n) => Math.round(n * 1e5) / 1e5;

  const x = clamp((target.left - page.left) / page.width);
  const y = clamp((target.top - page.top) / page.height);
  // Measured from the clamped origin, so a selection that starts above the page
  // does not report a width reaching back past its own start.
  const w = clamp((target.right - page.left) / page.width) - x;
  const h = clamp((target.bottom - page.top) / page.height) - y;

  // No area is no mark: it cannot be drawn, so it could never be found again.
  if (!(w > 0) || !(h > 0)) return null;

  return { x: round(x), y: round(y), w: round(w), h: round(h) };
};

/** How much of the selected text is kept as the bookmark's label. */
export const MAX_QUOTE_CHARS = 300;

const shorten = (value) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  // The ellipsis is stored, not merely shown: a truncated quote that looked
  // complete would be read as the whole line.
  return text.length > MAX_QUOTE_CHARS
    ? `${text.slice(0, MAX_QUOTE_CHARS).trimEnd()}…`
    : text;
};

/**
 * The current selection on a rendered page → the anchor to store, or null.
 *
 * Returns `{ pageNumber, rect, text, truncated }`.
 *
 * `truncated` says the selection ran off the bottom of the page it started on
 * and was clipped to it. Clipped rather than refused, for the reason the line
 * reader clips too: a reader who drags past a page break is better served by a
 * mark on the first page, with the interface saying so, than by a gesture that
 * silently does nothing.
 *
 * The page a selection STARTED on is the one that answers. A drag beginning on
 * page nine belongs to page nine, and answering for the page it ended on would
 * file the mark somewhere the reader was not looking when they began.
 */
/**
 * Where to put a scrolling box so a place on a page is in view.
 *
 * Pure, and separate from the viewer for one reason: this is the arithmetic that
 * decides whether a bookmark works, and it runs only in a browser rendering a
 * PDF — which is precisely what the test suite cannot do. Extracted, it can be
 * checked; left inline, it could only ever be checked by hand.
 *
 * `pageTop` is the page's distance from the top of the SCROLLED CONTENT, not
 * from the viewport. The caller measures it, because measuring is the part that
 * needs a real layout.
 *
 * With no rect the answer is the top of the page: that is a bookmark which names
 * a page and nothing finer. With one, the mark is centred — a mark pinned to the
 * top edge of a scrolling box reads as the start of something rather than as the
 * thing being pointed at.
 */
export const scrollTopForMark = ({ pageTop, pageHeight, boxHeight = 0, rect = null }) => {
  if (!Number.isFinite(pageTop) || !Number.isFinite(pageHeight) || pageHeight <= 0) return null;
  if (!rect || !Number.isFinite(Number(rect.y))) return Math.max(0, pageTop);

  const top = pageTop + Number(rect.y) * pageHeight;
  const markHeight = Number(rect.h ?? 0) * pageHeight;
  return Math.max(0, top - boxHeight / 2 + markHeight / 2);
};

export const pageAnchorFromSelection = (selection) => {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const start = range.startContainer;
  const element = start?.nodeType === 1 ? start : start?.parentElement;
  const pageEl = element?.closest?.("[data-pdf-page]");
  if (!pageEl) return null;

  const pageNumber = Number(pageEl.getAttribute("data-pdf-page"));
  if (!Number.isInteger(pageNumber) || pageNumber < 1) return null;

  const rect = rectWithin(range.getBoundingClientRect(), pageEl.getBoundingClientRect());
  if (!rect) return null;

  // Whether the selection left the page it began on. Read from the END of the
  // range rather than from the clamping above, because a mark that merely
  // reaches the last line of a page is not truncated and should not say it is.
  const end = range.endContainer;
  const endElement = end?.nodeType === 1 ? end : end?.parentElement;
  const truncated = endElement?.closest?.("[data-pdf-page]") !== pageEl;

  return { pageNumber, rect, text: shorten(selection.toString()), truncated };
};
