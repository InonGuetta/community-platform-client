import { useEffect, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { mediaApi } from "../../../../api/mediaApi";
import { pdfStates } from "../../../../utilities/constant";
import { logger } from "../../../../utilities/logger";

// Opening the original PDF with pdf.js, and saying outward how far that has
// got (loading, ready, error).
//
// ── Loaded only when somebody opens "מקור" ─────────────────────────────────
//
// pdf.js is ~130KB gzipped plus a ~1MB worker. TextViewer imports
// PdfViewer, and with it this file, lazily, so the archive, the notebook and the
// player never carry any of it.
// The worker is fetched by pdf.js itself, only once a document opens.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const usePdfDocument = ({ media, onStatusChange }) => {
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState(null);
  const [pageSize, setPageSize] = useState(null);

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

  // Three states and not a boolean, because "failed" is not "still loading".
  // The alert PdfViewer shows on failure ends with "אפשר לפתוח אותו
  // בכרטיסייה חדשה" — it points AT the button, so a failure has to be the one
  // case that brings the button back rather than the case that hides it.
  useEffect(() => {
    if (error) { onStatusChange?.(pdfStates.error); return; }
    onStatusChange?.(pdf && pageSize ? pdfStates.ready : pdfStates.loading);
  }, [error, pdf, pageSize, onStatusChange]);

  return { pdf, error, pageSize };
};
