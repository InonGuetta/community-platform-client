import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import RichNoteEditor from "./RichNoteEditor";
import { formatTime } from "../../../../utilities/formatTime";
import { noteHtmlToPlainText } from "../../../../utilities/noteHtml";

// One note, open for editing. The notebook stacks these — every note is on the
// page at once, one under the other, and the user scrolls between them instead
// of selecting one at a time.
//
// It owns nothing. The draft, the dirty flag and the editor's handle all belong
// to the page, because the toolbar at the top of the page has to reach whichever
// of these the caret is currently in — and a card that kept its own state would
// be invisible to it.

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : "";

const NoteCard = ({
  note, draft, isDirty, isActive,
  editorRef, cardRef,
  onDraftChange, onFormatsChange, onFocus, onError,
  onSave, onDelete, onOpenSource,
}) => (
  <Paper
    ref={cardRef}
    elevation={0}
    sx={{
      p: 3, borderRadius: 3, display: "flex", flexDirection: "column", gap: 2,
      border: "1px solid",
      // The card the caret is in is outlined, because with a column of them the
      // toolbar at the top would otherwise be acting on something the user
      // cannot identify.
      borderColor: isActive ? "primary.main" : "divider",
      transition: "border-color 0.2s",
      // Where a card lands when the list scrolls to it. In the desktop layout
      // the column is its own scroll container and a small inset is enough; on
      // a phone the PAGE scrolls, and the sticky navbar would otherwise cover
      // the card's first line.
      scrollMarginTop: { xs: 80, md: 8 },
    }}
  >
    <TextField
      value={draft.title}
      onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
      onFocus={onFocus}
      placeholder="כותרת ההערה"
      variant="standard"
      InputProps={{ disableUnderline: true, sx: { fontSize: "1.5rem", fontWeight: 700 } }}
    />

    {note.media_id && (
      <Button
        // The source opens in a floating dialog over the notebook rather than
        // navigating: the user is writing *about* it, so the note has to stay
        // where it is — and an unsaved draft would be lost the moment this page
        // unmounted.
        onClick={() => onOpenSource({
          mediaId: note.media_id,
          timestampSeconds: note.timestamp_seconds,
          mediaTitle: note.media_title,
          // The draft, not the saved note: what is on screen is what the user is
          // thinking about, saved or not. As text, because the source window
          // prints it in a header line.
          noteText: noteHtmlToPlainText(draft.body) || draft.title,
        })}
        startIcon={<PlayCircleOutlineIcon />}
        size="small"
        sx={{ alignSelf: "flex-start", textTransform: "none" }}
      >
        {`מתוך: ${note.media_title || "שיעור"}${note.timestamp_seconds != null ? ` · ${formatTime(note.timestamp_seconds)}` : ""}`}
      </Button>
    )}

    <RichNoteEditor
      ref={editorRef}
      html={draft.body}
      onChange={(body) => onDraftChange({ ...draft, body })}
      onFormatsChange={onFormatsChange}
      onFocus={onFocus}
      onError={onError}
      placeholder="כתוב כאן את ההערה שלך... אפשר גם להדביק תמונות."
    />

    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Typography variant="caption" color="text.secondary">
        {isDirty ? "יש שינויים שלא נשמרו" : `עודכן לאחרונה: ${formatDate(note.updated_at)}`}
      </Typography>
      <Box sx={{ display: "flex", gap: 1 }}>
        <IconButton color="error" onClick={onDelete} aria-label={`מחיקת ההערה ${note.title?.trim() || "ללא כותרת"}`}>
          <DeleteIcon />
        </IconButton>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={onSave} disabled={!isDirty}
          sx={{ borderRadius: 2, fontWeight: 700 }}>
          שמירה
        </Button>
      </Box>
    </Box>
  </Paper>
);

export default NoteCard;
