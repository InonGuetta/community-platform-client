import { useCallback, useEffect, useRef, useState } from "react";
import { clampZoom } from "./PdfToolbar";
import { zoomedScrollTop, wheelDeltaPixels } from "../../../../utilities/pageAnchors";
import { PAGE_GAP, BOX_PAD } from "./pdfLayout";

// How fast a wheel zooms. Multiplicative rather than a fixed step, because a
// trackpad pinch arrives as a stream of small deltas and 0.25 per event — what
// the toolbar buttons use — would be violent. The divisor is what makes one
// firm mouse notch (deltaY 120) a little under a 50% change.
const WHEEL_ZOOM_DIVISOR = 300;

// How big a page is drawn: fitted to the column, times the reader's zoom — from
// the toolbar or Ctrl+wheel — keeping the reader's place when it changes.
export const usePdfFit = ({ containerRef, pageSize, page, goToPage }) => {
  // containerRef (and any setter) is in the dependency lists below only because
  // it arrives as an argument: it is one object for the viewer's life, so it
  // never re-runs anything.
  // How wide a page would be drawn to fill the column exactly, before zoom.
  //
  // null until the column has actually been measured, and the difference
  // matters: every page's HEIGHT is derived from this, so a scroll position
  // computed before it is known is computed against the wrong page heights. A
  // default of 1 was indistinguishable from a real measurement of 1, which is
  // why this is null and not a number.
  const [fitScale, setFitScale] = useState(null);
  // What the reader asked for on top of that. 1 means "fits the column", which
  // is the useful zero point in a column narrower than a page.
  const [zoom, setZoom] = useState(1);

  // A zoom changes every page's height, so the scroll position lands somewhere
  // else entirely. This remembers where to put it back.
  const restoreTo = useRef(null);
  // What a wheel zoom asked to keep still. Finer than restoreTo, which puts the
  // reader at the top of a page: this keeps the LINE under the pointer where it
  // was, which is the whole point of zooming with the pointer over a word.
  const anchorTo = useRef(null);

  const scale = (fitScale ?? 1) * zoom;

  // ── Fitting the page to the column ───────────────────────────────────────
  useEffect(() => {
    const box = containerRef.current;
    if (!box || !pageSize || typeof ResizeObserver === "undefined") return;

    const fit = () => {
      // 24px for the scrollbar and a little air, so a page never sits under it.
      const available = Math.max(240, box.clientWidth - 24);
      setFitScale(available / pageSize.width);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [containerRef, pageSize]);

  const changeZoom = useCallback((next) => {
    // Captured BEFORE the scale changes, because the moment it does every page
    // above the reader grows or shrinks and the scroll offset means something
    // else. Without this, zooming on page 400 lands somewhere in the 300s.
    restoreTo.current = page;
    setZoom(next);
  }, [page]);

  useEffect(() => {
    // The pointer's request wins, and clears the other: both run off a change
    // of `scale`, and letting them both fire would scroll twice — once to the
    // line, then away from it to the top of its page.
    const anchor = anchorTo.current;
    if (anchor) {
      anchorTo.current = null;
      restoreTo.current = null;
      const frame = requestAnimationFrame(() => {
        const box = containerRef.current;
        const top = zoomedScrollTop({ ...anchor, padTop: BOX_PAD, gap: PAGE_GAP });
        if (box && top !== null) box.scrollTop = top;
      });
      return () => cancelAnimationFrame(frame);
    }

    if (restoreTo.current === null) return undefined;
    const wanted = restoreTo.current;
    restoreTo.current = null;
    // After the browser has laid the new sizes out, not before.
    const frame = requestAnimationFrame(() => goToPage(wanted));
    return () => cancelAnimationFrame(frame);
  }, [containerRef, scale, goToPage]);

  // ── Zooming inside the document instead of zooming the page ──────────────
  //
  // Ctrl+wheel is the browser's own zoom gesture, and a trackpad pinch arrives
  // as exactly the same event. With nothing listening, both went to the browser
  // and it enlarged the whole application — the header, the notes panel, the
  // sefer, all of it — when what the reader wanted was a closer look at one
  // line of one page.
  //
  // The listener is attached by hand rather than with onWheel, and that is the
  // part with teeth: React attaches wheel listeners as PASSIVE, and
  // preventDefault inside a passive listener does nothing at all. It would have
  // looked like a working handler that the browser overruled every time.
  //
  // It is attached to the scrolling box, so it only ever fires while the
  // pointer is inside the document. Anywhere else on the page the gesture still
  // belongs to the browser, which is right — a reader who wants the whole site
  // bigger must still be able to say so.
  useEffect(() => {
    const box = containerRef.current;
    if (!box || !pageSize) return undefined;

    const onWheel = (event) => {
      // metaKey as well as ctrlKey: a pinch on a Mac trackpad reports ctrl, but
      // Cmd+wheel is the same intent from the keyboard there.
      if (!event.ctrlKey && !event.metaKey) return;
      // Before the early return below, so a gesture at the zoom ceiling still
      // does not fall through and enlarge the whole application instead.
      event.preventDefault();

      const delta = wheelDeltaPixels(event, box.clientHeight);
      const next = clampZoom(zoom * Math.exp(-delta / WHEEL_ZOOM_DIVISOR));
      if (next === zoom) return;

      anchorTo.current = {
        scrollTop: box.scrollTop,
        pointerOffset: event.clientY - box.getBoundingClientRect().top,
        pageHeight: Math.round(pageSize.height * scale),
        nextPageHeight: Math.round(pageSize.height * (fitScale ?? 1) * next),
      };
      setZoom(next);
    };

    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, [containerRef, zoom, scale, fitScale, pageSize]);

  return { fitScale, zoom, scale, changeZoom };
};
