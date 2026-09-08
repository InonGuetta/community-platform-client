import { formatTime } from "./formatTime";

// What a bookmark IS, for every screen that shows one.
//
// There are four of those — the lecture page's panel, the notebook's sidebar,
// the notebook's floating source window, and the reader — and until now each
// answered the same three questions for itself: which kind of bookmark is this,
// what order do they go in, and what does its place read as. The answers drifted
// exactly where they were written twice, and none of the drifts raised anything:
//
//   * `timestamp_seconds` is NULL for a bookmark in a book, so sorting by it
//     compares against NaN. Array.prototype.sort with a comparator that returns
//     NaN leaves the order unspecified — so a sefer's bookmarks came back in no
//     particular order, in three separate places, and the page looked merely
//     untidy rather than broken.
//   * `formatTime(null)` is "0:00", so every bookmark in every book was labelled
//     with a timestamp it does not have.
//
// Both are fixed by there being one answer rather than four.

// Which anchor a bookmark carries decides how it reads, what clicking it does,
// and how it sorts. Offset 0 is the first character of a book and is a real
// place, so the test is against null/undefined and never falsy.
export const isTextBookmark = (bookmark) =>
  bookmark?.char_position !== null && bookmark?.char_position !== undefined;

// A bookmark placed on a page of the ORIGINAL file, rather than in the text
// extracted from it.
//
// The rectangle is what says so. page_number alone is not enough: it is also set
// on a text bookmark, where it is a citation copied from the chunk rather than
// the place itself.
//
// This kind owes nothing to the extraction, so re-running the pipeline cannot
// orphan it — it is the only one of the three that survives that untouched.
export const isPageBookmark = (bookmark) =>
  Number.isInteger(bookmark?.page_number) && Number.isFinite(Number(bookmark?.rect_x));

/**
 * The marks to draw on one page, in the coordinates they were stored in.
 *
 * Fractions of the page, so the caller positions them as percentages and the
 * mark lands where it was made at any zoom and on any screen.
 */
export const pageMarksFor = (pageNumber, bookmarks = []) =>
  bookmarks
    .filter((b) => isPageBookmark(b) && b.page_number === pageNumber)
    .map((b) => ({
      id: b.id,
      x: Number(b.rect_x),
      y: Number(b.rect_y),
      w: Number(b.rect_w),
      h: Number(b.rect_h),
    }));

// A bookmark in a book whose paragraph is gone.
//
// `chunk_id` is SET NULL when the chunk it pointed at is deleted, which is what
// happens to every chunk of a book each time the pipeline runs (migration 026).
// So this is not a corrupt row — it is the honest state of a bookmark that
// outlived the text it was placed in, and decision 5 of the plan says it stays
// listed and says so, rather than disappearing or scrolling nowhere.
export const isOrphaned = (bookmark) =>
  isTextBookmark(bookmark) && !Number.isInteger(bookmark?.chunk_id);

// Reading order, whichever kind of bookmark this is.
//
// The client mirror of the server's ORDER BY, and it has to exist because the
// list does not stay in the order it arrived: a newly created bookmark is
// appended to the slice, so anything that walks the list in order has to sort
// first.
//
// Each kind is compared in its OWN coordinate space, and neither is ever
// compared against the other's NULL — which is the whole bug. Within one media
// item only one space is ever populated, so the mixed case below only arises in
// the notebook, where a lecture's bookmarks and a book's sit in one array; there
// the recordings come first, deterministically, rather than at random.
// Three coordinate spaces now, and a bookmark is only ever compared within its
// own. Comparing across them is what produced NaN in the first place.
const KIND_ORDER = { recording: 0, page: 1, text: 2 };
const kindOf = (bookmark) => {
  if (isPageBookmark(bookmark)) return "page";
  return isTextBookmark(bookmark) ? "text" : "recording";
};

export const compareBookmarks = (a, b) => {
  const aKind = kindOf(a);
  const bKind = kindOf(b);
  if (aKind !== bKind) return KIND_ORDER[aKind] - KIND_ORDER[bKind];

  if (aKind === "page") return (a.page_number ?? 0) - (b.page_number ?? 0);
  if (aKind === "text") return (a.char_position ?? 0) - (b.char_position ?? 0);
  return (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0);
};

/** The same list, in reading order. Copies rather than sorting in place. */
export const inReadingOrder = (bookmarks = []) => [...bookmarks].sort(compareBookmarks);

// Where this bookmark is, in words.
//
// A book has no clock, so "בזמן 0:00" on every bookmark in a sefer is worse than
// saying nothing — and it is what formatTime(null) produced. The page is the
// unit people actually cite from a sefer, so it is preferred whenever the
// extractor could derive one; when it could not (a .txt, a .docx, a PDF whose
// boundaries were not safe to guess) the honest answer is that this is a place
// in the text without being able to name which page.
export const placeLabel = (bookmark) => {
  // Asked FIRST, because a page anchor has no char_position and would otherwise
  // fall through to the recording branch — where formatTime(null) is "0:00", and
  // every mark made in a sefer would wear a timestamp it does not have. That is
  // the same failure this function was written to fix, one anchor kind later.
  if (isPageBookmark(bookmark)) return `עמ׳ ${bookmark.page_number}`;
  if (!isTextBookmark(bookmark)) return `בזמן ${formatTime(bookmark?.timestamp_seconds)}`;
  if (isOrphaned(bookmark)) return "המיקום אינו זמין עוד";
  if (Number.isInteger(bookmark?.page_number)) return `עמ׳ ${bookmark.page_number}`;
  return "במיקום בטקסט";
};

// The same answer, sized for a chip.
//
// A separate function rather than a shorter constant, because the two are not
// the same sentence trimmed — "בזמן 12:34" makes sense on a list row and reads
// as noise inside a 40-pixel chip, where the number alone is the convention.
// Same pattern, for the same reason, as CHIP_LABEL_CHARS beside MAX_CHIP_TITLE
// in noteSource.js: a display form and a full form, deliberately different.
export const placeShortLabel = (bookmark) => {
  if (isPageBookmark(bookmark)) return `עמ׳ ${bookmark.page_number}`;
  if (!isTextBookmark(bookmark)) return formatTime(bookmark?.timestamp_seconds);
  if (isOrphaned(bookmark)) return "לא זמין";
  if (Number.isInteger(bookmark?.page_number)) return `עמ׳ ${bookmark.page_number}`;
  return "בטקסט";
};

// What the row says, on its two lines.
//
// The note is the user's own words and wins the first line whenever there is
// one. Failing that the quoted passage stands in, because "(ללא הערה)" on every
// row of a list is a list nobody can read — which is what a book's bookmarks
// looked like before a passage carried its text.
//
// The second line collects what is left: the quote, when it is not already the
// title, and then the place. Joined rather than stacked so the row stays two
// lines however much it carries.
export const bookmarkLines = (bookmark) => {
  const note = String(bookmark?.note ?? "").trim();
  const quote = String(bookmark?.quoted_text ?? "").trim();
  const place = placeLabel(bookmark);

  const title = note || quote || "(ללא הערה)";
  const detail = [quote && quote !== title ? `„${quote}”` : "", place].filter(Boolean).join(" · ");

  return { title, detail };
};
