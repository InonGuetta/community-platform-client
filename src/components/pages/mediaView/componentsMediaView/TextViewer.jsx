import { lazy, Suspense, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { mediaApi } from "../../../../api/mediaApi";

// Lazy, and that is the whole reason it is a separate module. pdf.js is ~130KB
// gzipped plus a worker of its own; the archive, the notebook and the player
// must not carry any of it to show a list of lectures. Nothing is fetched until
// somebody opens a PDF.
const PdfViewer = lazy(() => import("./PdfViewer"));

// The book, as it was uploaded. The whole of what a document page shows.
//
// ── There used to be a second view, and a toggle between them ──────────────
//
// The other one rendered the EXTRACTED text — the chunks the search and the
// summary are built from — line by line, and a bookmark was placed by dragging
// a handle onto a line. It was the default of the two.
//
// It is gone, and the toggle with it. The text in it is the OCR's reading of the
// page, and in this archive that reading is frequently wrong; offering it beside
// the original made the reader arbitrate between a book and a flawed transcript
// of it. Everything that view could do, this one does against the page itself —
// select the words, save the mark, land back on it — and the anchor it stores
// owes nothing to the extraction, so re-running the pipeline cannot age it.
//
// The extracted text is not wasted: it is still what the search matches and what
// the summary is written from. It is simply no longer something to read.
//
// ── Why the iframe points at the URL, and not at a blob ────────────────────
//
// This used to pull the whole file through axios into a Blob, mint a blob: URL
// and hand THAT to the frame. Three things were wrong with it, and only the
// third was visible:
//
//   1. A blob: URL is its own opaque origin. The browsers' built-in PDF viewers
//      are script-driven components, and an opaque origin inside a sandboxed
//      frame is exactly the combination they handle worst — which is why "מקור"
//      showed nothing at all for a PDF, and why loosening the sandbox by itself
//      did not fix it.
//   2. Nothing was displayed until the ENTIRE file had been downloaded into
//      memory. A large sefer meant a long spinner and a second copy of the file
//      in the tab, for no benefit: the browser streams and pages a PDF perfectly
//      well on its own, and can start rendering page one before page 400 has
//      arrived.
//   3. It was a private path nothing else used.
//
// The application already had the answer. Audio and video are handed
// `mediaApi.streamUrl(id)` and the browser fetches them itself — the httpOnly
// token cookie is sameSite "lax", so a same-site frame carries it exactly as a
// <video> does. This is that same proven path, for documents.
//
// ── A PDF is no longer handed to the browser at all ────────────────────────
//
// It is rendered by PdfViewer, using pdf.js. The browser's viewer reads a PDF
// perfectly and tells us nothing — which page is showing, what was selected,
// where on the page it sat — and those three facts are exactly what a bookmark
// on a line of the original needs. A viewer we own is the only way to have them.
//
// Everything else still goes to the frame below. A .docx is HTML the server
// generated, a .txt is plain text; both are for reading, neither is for marking,
// and the browser shows them well. Those two formats therefore have no way to
// place a bookmark at all now — the reading view was where it happened for them.
// Every document in this archive is a PDF, which is why that is a stated cost
// rather than a hole to paper over with a gesture nobody would find.

// ── The sandbox is decided per FORMAT, not once for everything ─────────────
//
// Because the two things this route serves are not alike, and treating them
// alike broke the common one.
//
// A DOCX arrives as HTML the server generated from an uploaded file. That is
// active content, and the sanitiser plus an opaque origin are the two things
// standing between it and the signed-in session. It keeps its sandbox.
//
// A PDF is not that. The browser hands it to its own viewer, which is a
// separately sandboxed component with document scripting disabled — and that
// viewer refuses to run inside a sandboxed frame, so `sandbox` here did not
// harden anything, it only produced a torn-page icon where a sefer should be.
// Every document in this archive is a PDF, so the source view was broken for
// all of them.
//
// A PDF no longer reaches the frame at all — PdfViewer renders it — so this map
// now decides only the formats below. It is kept because the reasoning is what
// stops the attribute being added back to a PDF route later.
//
// A .txt is inert as well, but keeping the attribute costs it nothing: plain
// text renders identically sandboxed. It stays in, so the exception is exactly
// one format wide.
const SANDBOXED_FORMATS = { pdf: false };
const TextViewer = ({ media, onAddBookmark, bookmarks, jumpTo, onPageChange }) => {
  const [loaded, setLoaded] = useState(false);
  const mediaId = media?.id;

  // Answered by the server, from the same rule the streaming route refuses with.
  // Asked BEFORE embedding rather than discovered by embedding: the route turns
  // an unviewable file into a 400 with a JSON body, and an iframe pointed at
  // that renders the JSON as text — which is worse than the blank frame it
  // replaced, because it looks like the document.
  const canEmbed = media?.can_view_inline !== false;

  const escapeHatch = (
    // Always present, whether or not the frame worked. Embedding depends on a
    // browser's plugin behaviour, which is not something this application can
    // promise; being able to reach your own upload is.
    //
    // Opening in a tab, and NOT a download beside it. This offered both, which
    // put a second "הורדת הקובץ" on the screen a few centimetres from the one
    // the actions bar already carries — the same file, the same route, twice.
    // A control repeated is a control the reader has to think about.
    //
    // BELOW the document and at the far end of the line, not above it. It is a
    // way out of this view rather than a way into it, and above the first page
    // it read as a heading for the book — the first thing the eye met on a page
    // whose whole point is the page underneath. `flex-end` is direction-aware,
    // so in this RTL application it lands on the LEFT, which is where it was
    // asked for and where a secondary action sits in the rest of the app.
    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1, flexWrap: "wrap" }}>
      <Button
        size="small"
        startIcon={<OpenInNewIcon />}
        href={mediaApi.streamUrl(mediaId)}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ textTransform: "none" }}
      >
        פתיחה בכרטיסייה חדשה
      </Button>
    </Box>
  );

  if (!canEmbed) {
    return (
      <Box>
        <Alert severity="info">
          {`לא ניתן להציג כאן קובץ מסוג .${media?.file_ext || "?"}. אפשר להוריד אותו מ„הורדה” שבתחתית הפאנל` +
            (media?.file_ext === "doc" ? ", או לשמור אותו כ־.docx ולהעלות מחדש." : ".")}
        </Alert>
        {escapeHatch}
      </Box>
    );
  }

  // Rendered by us, so it can be marked. See the note above.
  if (media?.file_ext === "pdf") {
    return (
      <Box>
        <Suspense
          fallback={
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          }
        >
          <PdfViewer
            media={media}
            onAddBookmark={onAddBookmark}
            bookmarks={bookmarks}
            jumpTo={jumpTo}
            onPageChange={onPageChange}
          />
        </Suspense>
        {escapeHatch}
      </Box>
    );
  }

  return (
    <Box>
      {!loaded && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Where the frame IS sandboxed, it is sandboxed without
          allow-same-origin — the part that matters. It then sits in an opaque
          origin even though its src is same-origin, so it reaches no cookie, no
          localStorage and no window.parent of this application.

          NEVER add allow-same-origin: with allow-scripts beside it, the two are
          the documented way to have no sandbox at all, since a frame granted
          both can reach its own sandbox attribute and remove it. */}
      <Box
        component="iframe"
        src={mediaApi.streamUrl(mediaId)}
        {...(SANDBOXED_FORMATS[media?.file_ext] === false
          ? {}
          : { sandbox: "allow-scripts" })}
        title="תצוגת המסמך"
        onLoad={() => setLoaded(true)}
        width="100%"
        height={650}
        sx={{
          border: "none",
          borderRadius: 2,
          display: loaded ? "block" : "none",
          bgcolor: "background.paper",
        }}
      />

      {escapeHatch}
    </Box>
  );
};

export default TextViewer;
