import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import RichNoteEditor from "./RichNoteEditor";
import { hasDragType } from "./useDragReorder";
import { formatTime } from "../../../../utilities/formatTime";
import { noteHtmlToPlainText } from "../../../../utilities/noteHtml";
import { BOOKMARK_DRAG_MIME } from "../../../../utilities/noteSource";

// One note, open for editing. The notebook stacks these — every note is on the
// page at once, one under the other, and the user scrolls between them instead
// of selecting one at a time.
//
// It owns nothing. The draft, the dirty flag and the editor's handle all belong
// to the page, because the toolbar at the top of the page has to reach whichever
// of these the caret is currently in — and a card that kept its own state would
// be invisible to it. The one exception is below: whether a bookmark is
// currently hovering over THIS card is nothing any other component could want.
//
// One thing can be dropped on a card: a BOOKMARK from the sidebar, which is
// written into this note's body as a source chip at the point it was dropped.
// A card used to accept a dragged NOTE as well, for reordering, through a grip
// beside its title — see useDragReorder for why that needed a handle and where
// the feature lives now.

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : "";

const NoteCard = ({
  note, draft, isDirty, isActive,
  editorRef, cardRef,
  onDraftChange, onFormatsChange, onFocus, onError,
  onSave, onDelete, onOpenSource, onDropSource,
}) => {
  const [sourceHovering, setSourceHovering] = useState(false);

  const handleDragOver = (event) => {
    if (!hasDragType(event.dataTransfer, BOOKMARK_DRAG_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!sourceHovering) setSourceHovering(true);
  };

  const handleDrop = (event) => {
    const payload = event.dataTransfer.getData(BOOKMARK_DRAG_MIME);
    if (!payload) return;
    // The browser's own handling of a drop into a contentEditable is what would
    // otherwise insert something here; this is the note's body, so it is ours
    // to write.
    event.preventDefault();
    setSourceHovering(false);
    try {
      // The point is passed through so the chip lands where the pointer let go
      // rather than at the end of the note — see RichNoteEditor.insertSource.
      onDropSource?.(JSON.parse(payload), { x: event.clientX, y: event.clientY });
    } catch {
      // A payload this card cannot read is not this card's problem to report:
      // nothing was inserted, which is exactly what a drop of nonsense should
      // do. The only wrong behaviour would be writing the raw string in.
    }
  };

  return (
    <Paper
      ref={cardRef}
      elevation={0}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      // relatedTarget is null when the pointer leaves for a child of this card,
      // which happens constantly while crossing the editor; without the
      // containment check the highlight would flicker off on every internal
      // boundary the drag crosses.
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setSourceHovering(false);
      }}
      sx={{
        p: 3, borderRadius: 3, display: "flex", flexDirection: "column", gap: 2,
        border: "1px solid",
        // The card the caret is in is outlined, because with a column of them the
        // toolbar at the top would otherwise be acting on something the user
        // cannot identify. A card a bookmark is hovering over says so more
        // loudly still: it is about to be written into.
        borderColor: sourceHovering ? "success.main" : (isActive ? "primary.main" : "divider"),
        ...(sourceHovering && { boxShadow: "0 0 0 3px rgba(46,125,50,0.18)" }),
        transition: "border-color 0.2s, box-shadow 0.2s",
        // Where a card lands when the list scrolls to it. In the desktop layout
        // the column is its own scroll container and a small inset is enough; on
        // a phone the PAGE scrolls, and the sticky navbar would otherwise cover
        // the card's first line.
        scrollMarginTop: { xs: 80, md: 8 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <TextField
          value={draft.title}
          onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
          onFocus={onFocus}
          placeholder="כותרת ההערה"
          variant="standard"
          fullWidth
          InputProps={{ disableUnderline: true, sx: { fontSize: "1.5rem", fontWeight: 700 } }}
        />
      </Box>

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
        // A source chip inside the body opens the same dialog the button above
        // does. They are the same idea at two scales: this note came from a
        // lecture, and this SENTENCE came from a moment in one.
        onOpenSource={onOpenSource}
        placeholder="כתוב כאן את ההערה שלך... אפשר גם להדביק תמונות ולגרור לכאן סימניות."
      />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="caption" color={sourceHovering ? "success.main" : "text.secondary"}>
          {sourceHovering
            ? "שחרר כאן כדי לשבץ קישור לשיעור"
            : (isDirty ? "יש שינויים שלא נשמרו" : `עודכן לאחרונה: ${formatDate(note.updated_at)}`)}
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton color="error" onClick={onDelete} aria-label={`מחיקת ההערה ${note.title?.trim() || "ללא כותרת"}`}>
            <DeleteIcon />
          </IconButton>
          {/* Ctrl+S does the same thing for the card the caret is in — see the
              keyboard handler in NotebookPage. */}
          <Tooltip title="שמירה (Ctrl+S)">
            <span>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={onSave} disabled={!isDirty}
                sx={{ borderRadius: 2, fontWeight: 700 }}>
                שמירה
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
};

export default NoteCard;
