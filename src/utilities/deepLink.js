// A link that carries a PLACE, and the two halves that have to agree on it.
//
// One side writes `/media/20?page=70`; the other reads it and opens the book
// there. They live in different corners of the application — the notebook's
// floating source window writes, the lecture page's controller reads — and a
// parameter renamed on one side raises nothing anywhere: the link is still well
// formed, the page still loads, and it simply opens at the beginning. That is
// exactly how this behaviour was missing in the first place.
//
// So both halves are here, they share the constants below, and neither spells a
// parameter name itself.

export const TIME_PARAM = "t";
export const PAGE_PARAM = "page";

/**
 * Where "open in the lecture page" should point, from where the reader is now.
 *
 * The floating source window is a place people READ from: they follow a mark
 * into a sefer and turn pages, or into a shiur and listen on. The link out used
 * to carry the MARK's second — where the window opened, not where they got to.
 * Follow a mark at 12:22, listen to 25:34, press the button, and you were sent
 * back to 12:22. A book was worse: nothing in the link at all, so every one of
 * them opened at page 1.
 *
 * @param {object} where
 * @param {number|string} where.mediaId
 * @param {boolean} where.isText - a book is placed by page, a recording by second.
 * @param {number|null} where.page - the page on screen, if a document is open.
 * @param {number} where.playedTo - the playhead, in seconds.
 * @param {number} where.bookmarkSeconds - the second the window opened at.
 */
export const continueReadingHref = ({
  mediaId, isText = false, page = null, playedTo = 0, bookmarkSeconds = 0,
}) => {
  const base = `/media/${mediaId}`;

  if (isText) {
    // Page 1 is where the book opens anyway, so saying so adds a parameter that
    // changes nothing — and an unread page is not a place at all.
    const at = Math.floor(Number(page));
    return Number.isFinite(at) && at > 1 ? `${base}?${PAGE_PARAM}=${at}` : base;
  }

  // 0 is not "the reader rewound to the start": it is what a source that has
  // not been played reports, and then the mark is still the best answer.
  const played = Math.floor(Number(playedTo));
  const at = Number.isFinite(played) && played > 0 ? played : Math.floor(Number(bookmarkSeconds));
  return Number.isFinite(at) && at > 0 ? `${base}?${TIME_PARAM}=${at}` : base;
};

/**
 * The page a `?page=` link asks a document to open at, or null.
 *
 * Null for page 1 as well as for nonsense, and the two mean the same thing to
 * the caller: there is nowhere to send the reader, so leave the book where it
 * opens. Anything that is not a whole page above the first is not a place — a
 * half page cannot be scrolled to, and a page number is the only thing in this
 * link a person is likely to edit by hand.
 *
 * @param {URLSearchParams|null} searchParams
 */
export const openingPageFrom = (searchParams) => {
  const raw = searchParams?.get?.(PAGE_PARAM);
  if (raw === null || raw === undefined || String(raw).trim() === "") return null;

  const page = Number(raw);
  if (!Number.isInteger(page) || page <= 1) return null;
  return page;
};
