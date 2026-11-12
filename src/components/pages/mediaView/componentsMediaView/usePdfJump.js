import { useEffect, useRef, useState } from "react";
import { clampPage } from "./PdfToolbar";
import { scrollTopForMark } from "../../../../utilities/pageAnchors";
import { isPageBookmark } from "../../../../utilities/bookmarks";

// How long a mark that was jumped to stays lit.
const FLASH_MS = 1600;

// Being sent to a mark (jumpTo). Returns the id of the mark lit right now.
export const usePdfJump = ({ containerRef, pdf, fitScale, jumpTo, setPage }) => {
  // containerRef (and any setter) is in the dependency lists below only because
  // it arrives as an argument: it is one object for the viewer's life, so it
  // never re-runs anything.
  // The mark this viewer has already scrolled to. See the jump effect below:
  // that effect deliberately retries, and this is what stops it repeating.
  const jumpedFor = useRef(null);
  // Which mark is being pointed at right now, after a jump.
  const [flashed, setFlashed] = useState(null);

  // Being sent to a mark: the page, then the place on it.
  //
  // The scroll position is computed from the page's own box rather than by
  // finding the drawn rectangle and asking it to scroll itself. In a virtualised
  // viewer that rectangle does not exist yet — its page has not been drawn,
  // because it is not on screen, because we have not scrolled to it. The
  // placeholder always has the right height, so the arithmetic works before
  // anything is rendered and needs no waiting.
  //
  // Two precisions, because there are two kinds of bookmark that name a page.
  // A mark made HERE carries the rectangle it was drawn on and can be pointed
  // at exactly. A bookmark left in the extracted-text reader carries only the
  // page its paragraph was cited from — the reader it was made in no longer
  // exists, and the offsets it holds describe a string this view never sees.
  // The page is what survives of it, so the page is where it goes: less than it
  // used to do, and the whole of what is still true. Silently doing nothing
  // would read as a broken bookmark rather than as an older one.
  // ── Why this effect retries instead of running once ──────────────────────
  //
  // Opening a source from the notebook mounts this viewer and hands it the mark
  // in the same breath. At that moment there is no document: `pdf` is still
  // loading, so the component is rendering a spinner, so containerRef holds
  // nothing and no page element exists to scroll to. The effect ran, found
  // nothing, and returned — and nothing ever asked it again. The window opened
  // on page 1 of 547 while the chip beside it read "עמ׳ 14".
  //
  // So `pdf` and `fitScale` are dependencies: the effect runs again when the
  // document arrives and again when the column has been measured. `jumpedFor`
  // is what keeps that from being three jumps instead of one — it remembers
  // WHICH mark has already been served, so the retries stop the moment one
  // succeeds and a reader who has scrolled away is never dragged back.
  //
  // The wait for `fitScale` is not caution: a page's height is pageSize.height
  // times the scale, so serving the jump before the column is measured lands
  // against heights that are about to change.
  useEffect(() => {
    const box = containerRef.current;
    if (!box || !pdf || fitScale === null || !Number.isInteger(jumpTo?.page_number)) return undefined;
    if (jumpedFor.current === jumpTo) return undefined;

    // Held to the document's own range, the same way the toolbar holds what is
    // typed into it. A page number can arrive from a link somebody edited by
    // hand or from a book that has since been re-uploaded shorter, and then
    // there is no such element: without this the effect would find nothing,
    // never mark itself done, and quietly retry for the life of the page while
    // the reader sat on page 1 wondering.
    const wanted = clampPage(jumpTo.page_number, pdf.numPages);
    const pageEl = box.querySelector(`[data-pdf-page="${wanted}"]`);
    if (!pageEl) return undefined;

    // Measured against the box rather than read off offsetTop, which is relative
    // to the nearest POSITIONED ancestor — not necessarily this scroller. Adding
    // the current scrollTop turns a viewport distance into a content distance.
    const boxRect = box.getBoundingClientRect();
    const pageRect = pageEl.getBoundingClientRect();
    const scrollTop = scrollTopForMark({
      pageTop: pageRect.top - boxRect.top + box.scrollTop,
      pageHeight: pageRect.height,
      boxHeight: box.clientHeight,
      // A bookmark from the extracted-text reader names a page and nothing
      // finer: the offsets it holds describe a string this view never sees.
      // Only when the page asked for is the page the mark is on. A clamped
      // request lands at the top of the last page; placing a rectangle from
      // page 900 onto page 547 would point at a line that is not there.
      rect: isPageBookmark(jumpTo) && wanted === jumpTo.page_number
        ? { y: Number(jumpTo.rect_y), h: Number(jumpTo.rect_h) }
        : null,
    });
    if (scrollTop === null) return undefined;

    jumpedFor.current = jumpTo;
    box.scrollTop = scrollTop;
    setPage(wanted);

    if (!isPageBookmark(jumpTo) || wanted !== jumpTo.page_number) return undefined;
    setFlashed(jumpTo.id);
    const timer = setTimeout(() => setFlashed(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [containerRef, jumpTo, pdf, fitScale, setPage]);

  return flashed;
};
