import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { mediaApi } from "../../../../api/mediaApi";
import { logger } from "../../../../utilities/logger";
import PdfToolbar, { clampPage } from "./PdfToolbar";
import BookmarkNotePanel from "./BookmarkNotePanel";
import { pageAnchorFromSelection, scrollTopForMark } from "../../../../utilities/pageAnchors";
import { isPageBookmark, pageMarksFor } from "../../../../utilities/bookmarks";
import { outputScaleFor } from "../../../../utilities/canvasScale";

// Rendering the original PDF ourselves, instead of handing it to the browser.
//
// ── Why take this on ───────────────────────────────────────────────────────
//
// The browser's own viewer reads a PDF perfectly and tells us nothing. It is a
// black box: no way to learn which page is on screen, what was selected, or
// where on the page it sat. That is the whole reason "mark a line in the source"
// was impossible — not the bookmark schema, the viewer.
//
// Rendering it here buys exactly three facts, and they are the anchor: the page
// number, the rectangle a selection covers, and the ability to draw a mark back
// onto the page afterwards. What it costs is everything the browser gave for
// free — paging, zoom, the toolbar — which is why the next step rebuilds the
// minimum of that rather than all of it.
//
// ── Loaded only when somebody opens "מקור" ─────────────────────────────────
//
// pdf.js is ~130KB gzipped plus a ~1MB worker. TextViewer imports this file
// lazily, so the archive, the notebook and the player never carry any of it.
// The worker is fetched by pdf.js itself, only once a document opens.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// A highlighter over a scan, not a sticker on top of one.
//
// `multiply` is what makes the ink underneath show through: a solid yellow
// rectangle over a photographed page hides the very words it is meant to point
// at. The colour is the same #fff59d the notebook's highlighter and the line
// reader already use, so a mark is one colour across the whole application.
const MARK_YELLOW = "#fff59d";
const FLASH_YELLOW = "#ffc400";
const FLASH_MS = 1600;

// How far outside the viewport a page starts rendering. Two screens ahead, so
// scrolling meets a drawn page rather than a blank one — and no further, because
// every rendered page is a canvas held in memory and a book here runs to 547.
const RENDER_MARGIN = "150% 0px";

// The bitmap is drawn at width × the display's pixel ratio and pdf.js is handed
// a matching transform, while the CSS box stays the size the layout wants.
// Nothing about the page's coordinates changes: the VIEWPORT is untouched, so
// every rectangle a bookmark stores still means what it meant. See
// utilities/canvasScale.js for what this was fixing.

// ── The text layer, and the variable it cannot work without ────────────────
//
// pdf.js positions each word as an absolutely placed span and sets its size as
// `calc(<n>px * var(--total-scale-factor))`. If the container does not define
// that variable, every one of those font sizes is invalid: the spans collapse,
// the words stop sitting over the glyphs they belong to, and a selection returns
// a rectangle that has nothing to do with what the reader highlighted.
//
// It is invisible when wrong — the page still looks right, because the page is a
// canvas underneath — which is exactly the kind of failure worth naming here.
const textLayerSx = {
  position: "absolute",
  inset: 0,
  overflow: "clip",
  opacity: 1,
  lineHeight: 1,
  textAlign: "initial",
  forcedColorAdjust: "none",
  // Left out at first, and all four are in pdf.js's own rule. The first is the
  // one with teeth: a phone that inflates text to make it readable inflates
  // these spans too, and then every one of them sits somewhere other than over
  // the word it belongs to.
  textSizeAdjust: "none",
  transformOrigin: "0 0",
  caretColor: "CanvasText",
  zIndex: 0,
  // The spans carry no visible ink of their own; they are a selectable overlay
  // sitting exactly on top of the drawn page.
  "& span, & br": {
    color: "transparent",
    position: "absolute",
    whiteSpace: "pre",
    cursor: "text",
    transformOrigin: "0% 0%",
  },
  "& ::selection": { bgcolor: "rgba(0, 90, 255, 0.28)" },
};

/**
 * One page: a canvas with a selectable text layer over it.
 *
 * Draws only while it is near the viewport and lets go of the bitmap when it is
 * not — 547 canvases at full size is hundreds of megabytes, so this is what
 * makes a real sefer openable at all.
 */
const PdfPage = ({ pdf, pageNumber, scale, width, height, observe, marks, flashed }) => {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const textRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => observe(wrapperRef.current, pageNumber, setVisible), [observe, pageNumber]);

  useEffect(() => {
    if (!visible || !pdf) return;
    let task = null;
    let cancelled = false;
    // Captured now, not read in the cleanup. By the time cleanup runs the refs
    // may already be null — and then the bitmap is never released, which on a
    // 547-page book is the exact leak this whole arrangement exists to prevent.
    const canvas = canvasRef.current;
    const textContainer = textRef.current;

    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });

        if (!canvas) return;
        // See outputScaleFor: the bitmap is the page at the screen's real
        // resolution, and the CSS box below is what decides its displayed size.
        const output = outputScaleFor(viewport);
        canvas.width = Math.floor(viewport.width * output);
        canvas.height = Math.floor(viewport.height * output);

        task = page.render({
          // A page is opaque paper. Saying so lets the browser skip compositing
          // an alpha channel nothing in a PDF page uses.
          canvasContext: canvas.getContext("2d", { alpha: false }),
          viewport,
          // The viewport is left alone and the extra resolution is applied here
          // instead, so pdf.js still reports the coordinates the layout and the
          // text layer are built from.
          transform: output === 1 ? null : [output, 0, 0, output, 0, 0],
        });
        await task.promise;
        if (cancelled) return;

        // Rebuilt rather than reused: the spans carry positions computed for one
        // scale, so a zoom leaves every word in the wrong place otherwise.
        if (!textContainer) return;
        textContainer.replaceChildren();
        const layer = new pdfjs.TextLayer({
          textContentSource: await page.getTextContent(),
          container: textContainer,
          viewport,
        });
        await layer.render();
      } catch (err) {
        // A cancelled render is the ordinary outcome of scrolling or zooming
        // while one is in flight, not a fault.
        if (!cancelled && err?.name !== "RenderingCancelledException") {
          logger.warn(`[pdf] page ${pageNumber} failed to render: ${err.message}`);
        }
      }
    })();

    return () => {
      cancelled = true;
      task?.cancel();
      // Releasing the bitmap is the point of the whole arrangement.
      if (canvas) { canvas.width = 0; canvas.height = 0; }
      textContainer?.replaceChildren();
    };
  }, [visible, pdf, pageNumber, scale]);

  return (
    <Box
      ref={wrapperRef}
      data-pdf-page={pageNumber}
      sx={{
        position: "relative",
        width, height,
        mx: "auto", mb: 2,
        bgcolor: "#fff",
        boxShadow: 2,
        // See textLayerSx: pdf.js writes every span's font size in terms of this.
        "--total-scale-factor": scale,
      }}
    >
      <Box component="canvas" ref={canvasRef} sx={{ display: "block", width: "100%", height: "100%" }} />

      {/* Between the page and the text layer, and inert. Above the canvas so the
          mark is visible; below the spans and with no pointer events, so it can
          never stand between the reader and selecting the next line. */}
      {marks.map((mark) => (
        <Box
          key={mark.id}
          data-mark-id={mark.id}
          sx={{
            position: "absolute",
            left: `${mark.x * 100}%`,
            top: `${mark.y * 100}%`,
            width: `${mark.w * 100}%`,
            height: `${mark.h * 100}%`,
            bgcolor: mark.id === flashed ? FLASH_YELLOW : MARK_YELLOW,
            mixBlendMode: "multiply",
            borderRadius: "2px",
            pointerEvents: "none",
            transition: "background-color 300ms",
            ...(mark.id === flashed && { boxShadow: "0 0 0 3px rgba(255,179,0,0.85)" }),
          }}
        />
      ))}

      <Box ref={textRef} className="textLayer" sx={textLayerSx} />
      {/* The page number, as the browser's viewer showed it. It is also the half
          of the anchor a reader can read back off the screen. */}
      <Typography
        variant="caption"
        sx={{
          position: "absolute", insetInlineStart: 8, bottom: 4,
          color: "text.disabled", pointerEvents: "none",
        }}
      >
        {pageNumber}
      </Typography>
    </Box>
  );
};

const PdfViewer = ({
  media,
  onAddBookmark,
  bookmarks = [],
  jumpTo = null,
  // Which page is being read, reported outward as it changes.
  //
  // The page was private to this component, which meant that anything wanting
  // to CARRY a reader's place — a link to the full lecture page, most of all —
  // had no way to learn it, and could only ever open the book at page 1.
  onPageChange,
}) => {
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const watchers = useRef(new Map());

  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(null);
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
  const [page, setPage] = useState(1);

  // Which pages are actually in view, as opposed to near enough to be worth
  // drawing. The page a reader would name is the topmost of them.
  const onScreen = useRef(new Set());
  // A zoom changes every page's height, so the scroll position lands somewhere
  // else entirely. This remembers where to put it back.
  const restoreTo = useRef(null);
  // The mark this viewer has already scrolled to. See the jump effect below:
  // that effect deliberately retries, and this is what stops it repeating.
  const jumpedFor = useRef(null);

  // ── Marking a line of the original ───────────────────────────────────────
  //
  // Captured when the selection settles, not read when Save is pressed: the
  // panel below contains a text field, and focusing it collapses the selection.
  // Reading it at save time would read nothing.
  //
  // That is also why the panel shows the words back — by the time the reader is
  // typing, the blue highlight they made is gone, so the quote is what says
  // which mark the note belongs to.
  const [pending, setPending] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  // Which mark is being pointed at right now, after a jump.
  const [flashed, setFlashed] = useState(null);

  const scale = (fitScale ?? 1) * zoom;

  // ── Opening the document ─────────────────────────────────────────────────
  useEffect(() => {
    if (!media?.id) return;
    let cancelled = false;
    let doc = null;
    setPdf(null);
    setError(null);

    const task = pdfjs.getDocument({
      url: mediaApi.streamUrl(media.id),
      // The stream route answers Range requests, so pdf.js pulls the pages it
      // needs rather than the whole file. On a 26MB sefer that is the difference
      // between a page appearing and a minute of waiting.
      withCredentials: true,
      // ── Glyphs drawn from the font program, not through a font face ───────
      //
      // By default pdf.js converts each embedded font to OpenType, registers it
      // as a @font-face, and draws text with ctx.fillText. When that font is not
      // the one the browser actually uses, the glyphs still appear — pdf.js can
      // fall back through the ToUnicode map — but they are placed with the
      // WRONG font's widths. Letters overlap, gaps open inside words, and thin
      // Hebrew letters land on top of their neighbours: "gemini" reads as
      // "gem in i", and "האינטלקטואלית" loses its yuds and vavs.
      //
      // This was diagnosed by rendering page 1 of the reader's own file headless
      // and looking at both outputs. With the default the page came out as rows
      // of .notdef boxes; with this flag it came out pixel-correct, matching the
      // browser's own viewer. The font data was never the problem — the file's
      // four Arial subsets are embedded, valid and complete, which is what made
      // this worth ruling out first.
      //
      // The cost is real and it is speed: every glyph becomes path commands
      // instead of a text draw. It is worth paying here because only pages near
      // the viewport are ever drawn, each is drawn once, and a reader comparing
      // a sefer against a citation needs the page to be RIGHT far more than they
      // need it 20ms sooner.
      disableFontFace: true,
    });

    task.promise
      .then(async (loaded) => {
        if (cancelled) { loaded.destroy(); return; }
        doc = loaded;
        // ONE page is measured, not all of them: 547 getPage calls before the
        // first pixel would be slower than the download. Pages of a book share a
        // size, and any that does not is corrected when it draws.
        const first = await loaded.getPage(1);
        const viewport = first.getViewport({ scale: 1 });
        if (cancelled) return;
        setPageSize({ width: viewport.width, height: viewport.height });
        setPdf(loaded);
      })
      .catch((err) => {
        if (cancelled) return;
        logger.warn(`[pdf] could not open media ${media.id}: ${err.message}`);
        setError(err.message);
      });

    return () => {
      cancelled = true;
      task.destroy?.();
      doc?.destroy();
    };
  }, [media?.id]);

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
  }, [pageSize]);

  useEffect(() => {
    const box = containerRef.current;
    if (!box || !onAddBookmark) return undefined;

    // selectionchange rather than mouseup, so selecting with Shift+arrows works
    // too — a keyboard user gets no mouse event at all.
    const onSelectionChange = () => {
      const anchor = pageAnchorFromSelection(document.getSelection());
      // A cleared selection must not close a panel the reader is typing into.
      // Putting it away is Cancel's job, and Escape's.
      if (!anchor) return;
      setPending((previous) => {
        const key = `${anchor.pageNumber}:${anchor.rect.x}:${anchor.rect.y}`;
        const wasKey = previous && `${previous.pageNumber}:${previous.rect.x}:${previous.rect.y}`;
        // A new mark discards the note typed for the last one. Keeping it would
        // file words written about one line against a different one, and the
        // reader — whose selection has just moved — has no reason to look at the
        // field again before saving.
        if (key !== wasKey) setNote("");
        return anchor;
      });
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [onAddBookmark]);

  const dismiss = useCallback(() => {
    setPending(null);
    setNote("");
  }, []);

  const save = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      // The page, the rectangle, the words as a label, and the note — one
      // request. Nothing here carries a chunk or an offset: this anchor owes
      // nothing to the extracted text, which is why re-running the pipeline
      // cannot touch it.
      await onAddBookmark({
        pageNumber: pending.pageNumber,
        rect: pending.rect,
        quotedText: pending.text || undefined,
        note: note.trim() || undefined,
      });
      dismiss();
      // The selection is stale the moment the mark is stored: the page re-renders
      // with the highlight on it.
      document.getSelection()?.removeAllRanges();
    } finally {
      setSaving(false);
    }
  };

  // Reaching a page by its number. The wrappers carry it as an attribute, which
  // is also how a bookmark will find its page.
  const goToPage = useCallback((wanted) => {
    const box = containerRef.current;
    if (!box) return;
    const target = box.querySelector(`[data-pdf-page="${wanted}"]`);
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    setPage(wanted);
  }, []);

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
  }, [jumpTo, pdf, fitScale]);


  // Reported from one place rather than from each of the three that move the
  // page — the toolbar, a jump to a mark, and the observer watching what is
  // actually on screen. They already agree on `page`; this just forwards it.
  // An inline callback here would re-run this on every render; it stays correct
  // because the parent sets state to the same number and React stops there.
  useEffect(() => {
    onPageChange?.(page);
  }, [page, onPageChange]);

  const changeZoom = useCallback((next) => {
    // Captured BEFORE the scale changes, because the moment it does every page
    // above the reader grows or shrinks and the scroll offset means something
    // else. Without this, zooming on page 400 lands somewhere in the 300s.
    restoreTo.current = page;
    setZoom(next);
  }, [page]);

  useEffect(() => {
    if (restoreTo.current === null) return;
    const wanted = restoreTo.current;
    restoreTo.current = null;
    // After the browser has laid the new sizes out, not before.
    const frame = requestAnimationFrame(() => goToPage(wanted));
    return () => cancelAnimationFrame(frame);
  }, [scale, goToPage]);

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
  }, [pdf]);

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
  }, [pdf]);

  if (error) {
    return (
      <Alert severity="error">
        לא ניתן להציג את הקובץ. אפשר לפתוח אותו בכרטיסייה חדשה.
      </Alert>
    );
  }

  if (!pdf || !pageSize) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const width = Math.round(pageSize.width * scale);
  const height = Math.round(pageSize.height * scale);

  return (
    <Box>
      <PdfToolbar
        page={page}
        pages={pdf.numPages}
        onPage={goToPage}
        zoom={zoom}
        onZoom={changeZoom}
        onFit={() => changeZoom(1)}
      />

      <Box
        ref={containerRef}
        data-pdf-scroll=""
        sx={{ maxHeight: "70vh", overflowY: "auto", bgcolor: "action.hover", p: 1, borderRadius: 2 }}
      >
        {Array.from({ length: pdf.numPages }, (_, i) => (
          <PdfPage
            key={i + 1}
            pdf={pdf}
            pageNumber={i + 1}
            scale={scale}
            width={width}
            height={height}
            observe={observe}
            marks={pageMarksFor(i + 1, bookmarks)}
            flashed={flashed}
          />
        ))}
      </Box>

      {pending && (
        <BookmarkNotePanel
          label="שמירת סימנייה על הקטע המסומן"
          quote={pending.text}
          note={note}
          onNoteChange={setNote}
          onSave={save}
          onCancel={dismiss}
          saving={saving}
          notice={pending.truncated ? "הסימון יישמר עד סוף העמוד." : null}
        />
      )}
    </Box>
  );
};

export default PdfViewer;
