import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import FitScreenIcon from "@mui/icons-material/FitScreen";

// The part of the browser's toolbar we chose to rebuild.
//
// Handing a PDF to the browser gave paging, zoom, search, print and rotation for
// nothing. Rendering it ourselves — which is what makes a line markable at all —
// takes all of that away, so each piece had to earn its place back:
//
//   page + total, prev/next, jump   kept. A sefer is navigated by page, and
//                                   without these the only way to reach page 400
//                                   of 547 is to scroll to it.
//   zoom                            kept. The column is narrower than a page.
//   print, download                 dropped. The actions bar under the panel
//                                   already carries the file.
//   search                          dropped. The "קריאה" tab searches the text,
//                                   and the archive's own search covers it too —
//                                   both over text that is indexed rather than
//                                   scanned for on a page at a time.
//   rotate                          dropped. Nothing in this archive needs it.
//
// Presentational: it owns none of the state it shows. The viewer knows which
// page is on screen, and this asks it to change.

// A page is a whole number and the reader can type anything into the box.
export const clampPage = (value, total) => {
  const page = Math.trunc(Number(value));
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(page, total);
};

// 100% is the page fitted to the column, not the page at its natural size —
// which is what a percentage means in a desktop PDF viewer. In a column narrower
// than a page, "fits" is the useful zero point: the reader wants to know how far
// from comfortable they are, not what the print shop would call it.
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 0.25;

export const clampZoom = (value) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));

const PdfToolbar = ({ page, pages, onPage, zoom, onZoom, onFit }) => {
  // The box holds a draft while it is being typed into, so that clearing it to
  // type a new number does not immediately jump to page 1.
  const [draft, setDraft] = useState(String(page));
  useEffect(() => { setDraft(String(page)); }, [page]);

  const commit = () => {
    const next = clampPage(draft, pages);
    setDraft(String(next));
    onPage(next);
  };

  return (
    <Box
      sx={{
        display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap",
        px: 1, py: 0.5, mb: 1,
        bgcolor: "background.paper", borderRadius: 2, boxShadow: 1,
      }}
    >
      <Tooltip describeChild title="העמוד הקודם">
        <span>
          <IconButton size="small" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="העמוד הקודם">
            <KeyboardArrowUpIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip describeChild title="העמוד הבא">
        <span>
          <IconButton size="small" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="העמוד הבא">
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      {/* Typed into as well as read from: on a book of 547 pages, reaching one by
          scrolling is not reaching it. */}
      <InputBase
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          // Escape puts back what the page actually is, rather than leaving a
          // half-typed number looking like the answer.
          if (e.key === "Escape") setDraft(String(page));
        }}
        inputProps={{
          "aria-label": "מספר עמוד",
          inputMode: "numeric",
          style: { textAlign: "center", padding: 0 },
        }}
        sx={{ width: 52, px: 0.5, border: 1, borderColor: "divider", borderRadius: 1, fontSize: 14 }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
        / {pages}
      </Typography>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <Tooltip describeChild title="הקטנה">
        <span>
          <IconButton
            size="small"
            onClick={() => onZoom(clampZoom(zoom - ZOOM_STEP))}
            disabled={zoom <= MIN_ZOOM}
            aria-label="הקטנה"
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: 46, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
      >
        {Math.round(zoom * 100)}%
      </Typography>
      <Tooltip describeChild title="הגדלה">
        <span>
          <IconButton
            size="small"
            onClick={() => onZoom(clampZoom(zoom + ZOOM_STEP))}
            disabled={zoom >= MAX_ZOOM}
            aria-label="הגדלה"
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip describeChild title="התאמה לרוחב">
        <span>
          <IconButton size="small" onClick={onFit} disabled={zoom === 1} aria-label="התאמה לרוחב">
            <FitScreenIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

export default PdfToolbar;
