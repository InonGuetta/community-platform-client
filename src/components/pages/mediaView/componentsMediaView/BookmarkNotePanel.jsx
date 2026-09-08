import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import BookmarkIcon from "@mui/icons-material/Bookmark";

// The note asked for after a bookmark is placed, and before anything is stored.
//
// ── Why it comes first ─────────────────────────────────────────────────────
//
// So the place and the words travel in ONE request, which is the shape a
// bookmark on a recording has always been saved in. Creating first and
// annotating afterwards would need a second call, and would leave a bookmark
// behind whenever the second one failed or the reader changed their mind.
//
// ── Why it is shared ───────────────────────────────────────────────────────
//
// Two gestures now end here: dropping the marker on a line of the extracted
// text, and selecting a line on a page of the original. They ask the same
// question about the same thing, and two copies of this would answer it
// differently within a release — one would grow a hint the other lacked, or
// save on Enter where the other did not.
//
// It owns no state. The caller holds the draft, because the caller is what knows
// where the mark is going and what to do with it.
const BookmarkNotePanel = ({
  quote,
  note,
  onNoteChange,
  onSave,
  onCancel,
  saving = false,
  notice = null,
  label = "שמירת סימנייה",
}) => {
  const ref = useRef(null);

  // The panel is rendered below a reading area capped at 70vh, so on a long
  // document it opens under the fold: the reader marks something, the page does
  // not visibly change, and the only conclusion available is that nothing
  // happened. Bringing it into view is what turns the gesture into an answer.
  useEffect(() => {
    ref.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <Paper
      ref={ref}
      elevation={6}
      aria-label={label}
      sx={{
        mt: 1, p: 1.5, display: "flex", flexDirection: "column", gap: 1,
        position: "sticky", bottom: 8, zIndex: 2,
      }}
    >
      {/* What is about to be saved, in the reader's own words rather than a
          description of them. The visual selection is gone by the time they are
          typing — focusing a field collapses it — so this is what says which
          mark the note belongs to. */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {quote ? `„${quote}”` : "הקטע שסומן"}
      </Typography>

      {notice && <Alert severity="info" sx={{ py: 0 }}>{notice}</Alert>}

      <TextField
        label="הערה (לא חובה)"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        size="small"
        fullWidth
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onSave(); }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
      />

      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button onClick={onCancel} size="small" disabled={saving}>ביטול</Button>
        <Button
          onClick={onSave}
          size="small"
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <BookmarkIcon />}
        >
          שמירת סימנייה
        </Button>
      </Box>
    </Paper>
  );
};

export default BookmarkNotePanel;
