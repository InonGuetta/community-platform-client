import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import * as pdfjs from "pdfjs-dist";
import { logger } from "../../../../utilities/logger";
import { outputScaleFor } from "../../../../utilities/canvasScale";
import { PAGE_GAP } from "./pdfLayout";

// A highlighter over a scan, not a sticker on top of one.
//
// `multiply` is what makes the ink underneath show through: a solid yellow
// rectangle over a photographed page hides the very words it is meant to point
// at. The colour is the same #fff59d the notebook's highlighter and the line
// reader already use, so a mark is one colour across the whole application.
const MARK_YELLOW = "#fff59d";
const FLASH_YELLOW = "#ffc400";

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
        mx: "auto", mb: `${PAGE_GAP}px`,
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

export default PdfPage;
