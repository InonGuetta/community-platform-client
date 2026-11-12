import { useCallback, useEffect, useRef, useState } from "react";

// How far outside the viewport a page starts rendering. Two screens ahead, so
// scrolling meets a drawn page rather than a blank one — and no further, because
// every rendered page is a canvas held in memory and a book here runs to 547.
const RENDER_MARGIN = "150% 0px";

// Which page is being read (reported outward), which pages are near enough to
// draw (PdfPage asks through `observe`), and going to a page by its number.
export const usePdfPageTracking = ({ containerRef, pdf, onPageChange }) => {
  // containerRef (and any setter) is in the dependency lists below only because
  // it arrives as an argument: it is one object for the viewer's life, so it
  // never re-runs anything.
  const observerRef = useRef(null);
  const watchers = useRef(new Map());
  const [page, setPage] = useState(1);

  // Which pages are actually in view, as opposed to near enough to be worth
  // drawing. The page a reader would name is the topmost of them.
  const onScreen = useRef(new Set());

  // Reaching a page by its number. The wrappers carry it as an attribute, which
  // is also how a bookmark will find its page.
  const goToPage = useCallback((wanted) => {
    const box = containerRef.current;
    if (!box) return;
    const target = box.querySelector(`[data-pdf-page="${wanted}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    setPage(wanted);
  }, [containerRef]);

  // Reported from one place rather than from each of the three that move the
  // page — the toolbar, a jump to a mark, and the observer watching what is
  // actually on screen. They already agree on `page`; this just forwards it.
  // An inline callback here would re-run this on every render; it stays correct
  // because the parent sets state to the same number and React stops there.
  useEffect(() => {
    onPageChange?.(page);
  }, [page, onPageChange]);

  // ── Which pages are near enough to draw ──────────────────────────────────
  //
  // One observer for the whole document rather than one per page: 547 observers
  // is 547 things for the browser to keep in step on every scroll.
  const observe = useCallback((node, pageNumber, setVisible) => {
    if (!node) return undefined;
    watchers.current.set(node, setVisible);
    observerRef.current?.observe(node);
    return () => {
      watchers.current.delete(node);
      observerRef.current?.unobserve(node);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          watchers.current.get(entry.target)?.(entry.isIntersecting);
        }
      },
      { root: containerRef.current, rootMargin: RENDER_MARGIN }
    );
    observerRef.current = observer;
    for (const node of watchers.current.keys()) observer.observe(node);
    return () => { observer.disconnect(); observerRef.current = null; };
  }, [containerRef, pdf]);

  // A SECOND observer, with no margin, answering a different question.
  //
  // The one above asks "is this page close enough to be worth drawing", and its
  // margin deliberately reaches two screens out — so its answer includes pages
  // nobody is looking at. The page a reader would name is the topmost one
  // actually on screen, which needs its own observer at the real edge.
  useEffect(() => {
    const box = containerRef.current;
    if (!box || !pdf) return undefined;
    // Captured, not read in the cleanup: by then the ref may point elsewhere
    // and the set would be left holding a previous document's pages.
    const visible = onScreen.current;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const number = Number(entry.target.getAttribute("data-pdf-page"));
          if (entry.isIntersecting) visible.add(number);
          else visible.delete(number);
        }
        if (visible.size > 0) setPage(Math.min(...visible));
      },
      { root: box, rootMargin: "0px", threshold: 0 }
    );
    for (const node of box.querySelectorAll("[data-pdf-page]")) observer.observe(node);
    return () => { observer.disconnect(); visible.clear(); };
  }, [containerRef, pdf]);

  return { page, setPage, goToPage, observe };
};
