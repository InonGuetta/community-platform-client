import { useRef } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import PdfToolbar from "./PdfToolbar";
import BookmarkNotePanel from "./BookmarkNotePanel";
import PdfPage from "./PdfPage";
import { BOX_PAD } from "./pdfLayout";
import { usePdfDocument } from "./usePdfDocument";
import { usePdfPageTracking } from "./usePdfPageTracking";
import { usePdfFit } from "./usePdfFit";
import { usePdfMarkSelection } from "./usePdfMarkSelection";
import { usePdfJump } from "./usePdfJump";
import { pageMarksFor } from "../../../../utilities/bookmarks";

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
// ── Where each part lives ──────────────────────────────────────────────────
//
// PdfPage draws one page. usePdfDocument opens the file (and is where pdf.js's
// worker is set up); usePdfPageTracking knows which page is being read and
// which are near enough to draw; usePdfFit sizes the pages and zooms;
// usePdfJump goes to a mark; usePdfMarkSelection turns a selection into a
// bookmark. This file wires them together and lays the document out.
//
// Nothing outside this file imports any of them. PdfPage and usePdfDocument
// import pdf.js, and TextViewer imports THIS file lazily so that pdf.js stays
// out of the main bundle; a static import of either from anywhere else would
// quietly undo that (see utilities/constant.js → pdfStates for the same trap).

const PdfViewer = ({
  media,
  onAddBookmark,
  bookmarks = [],
  jumpTo = null,
  // Whether there is a document on the screen yet, reported outward.
  //
  // "loading" covers both waits and they look the same from outside: the lazy
  // chunk arriving, and then pdf.js opening a file that can run to 26MB. Only
  // this component can tell them apart from "there is a page to look at", and
  // until it said so, anything rendered beside it had to guess — which is why
  // the way out of this view sat above an empty box for as long as the book
  // took to open.
  onStatusChange,
  // Which page is being read, reported outward as it changes.
  //
  // The page was private to this component, which meant that anything wanting
  // to CARRY a reader's place — a link to the full lecture page, most of all —
  // had no way to learn it, and could only ever open the book at page 1.
  onPageChange,
}) => {
  const containerRef = useRef(null);
  const { pdf, error, pageSize } = usePdfDocument({ media, onStatusChange });
  const { page, setPage, goToPage, observe } = usePdfPageTracking({ containerRef, pdf, onPageChange });
  const { fitScale, zoom, scale, changeZoom } = usePdfFit({ containerRef, pageSize, page, goToPage });
  const { pending, note, setNote, saving, save, dismiss } = usePdfMarkSelection({
    containerRef, onAddBookmark, ready: Boolean(pdf && pageSize),
  });
  const flashed = usePdfJump({ containerRef, pdf, fitScale, jumpTo, setPage });

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
        sx={{
          maxHeight: "70vh", overflowY: "auto", bgcolor: "action.hover",
          // See PAGE_GAP / BOX_PAD: the zoom arithmetic reads these same numbers.
          p: `${BOX_PAD}px`, borderRadius: 2,
        }}
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
