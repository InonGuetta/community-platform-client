import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import NoteCard from "../../notebook/componentsNotebook/NoteCard";
import NoteToolbar from "../../notebook/componentsNotebook/NoteToolbar";
import SourcePreviewDialog from "../../notebook/componentsNotebook/SourcePreviewDialog";
import UntitledNoteDialog from "../../notebook/componentsNotebook/UntitledNoteDialog";
import ConfirmingDeletionDialog from "../../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import { NOTEBOOK_SHELF } from "../../personal/personalShelves";
import useLessonNotebook from "../useLessonNotebook";

// The notebook strip under a lesson: every note taken on it or quoting it, open
// for editing in place, with the same cards, toolbar and source window as
// /notebook. See useLessonNotebook for what belongs here and why a chip for this
// lesson moves the player instead of opening a window.
const LessonNotebook = ({ media, isText, currentTime, readerPage, bookmarks, onSeek, onJumpTo }) => {
  const notebook = useLessonNotebook({ media, isText, currentTime, readerPage, bookmarks, onSeek, onJumpTo });
  const { notes, loading, preview } = notebook;

  return (
    <Paper
      data-testid="lesson-notebook"
      elevation={0}
      sx={{ mt: 3, p: { xs: 2, md: 3 }, borderRadius: 3, border: "1px solid", borderColor: "divider" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MenuBookIcon color="primary" />
          <Typography variant="h6" fontWeight={800} color="primary">המחברת שלי לשיעור זה</Typography>
          {notes.length > 0 && <Chip size="small" label={notes.length} />}
        </Box>

        {/* Only when there is a card to format — a strip of disabled buttons
            over an empty notebook is noise on a page that is about the lesson. */}
        {notes.length > 0 && (
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", minWidth: 280 }}>
            <NoteToolbar
              onCommand={notebook.execCommand}
              onFontSize={notebook.setFontSize}
              formats={notebook.formats}
              disabled={!notebook.activeNoteId}
            />
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
          <Button
            component={RouterLink}
            to={NOTEBOOK_SHELF.path}
            variant="outlined"
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            לכל המחברת
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={notebook.handleCreate}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            הערה חדשה לשיעור
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={28} /></Box>
      ) : notes.length === 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, py: 4, color: "text.secondary" }}>
          <NoteAltOutlinedIcon sx={{ fontSize: 48, opacity: 0.4 }} />
          <Typography variant="body2">
            {"עדיין אין הערות לשיעור הזה. לחץ על \"הערה חדשה לשיעור\" כדי להתחיל לכתוב."}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
            alignItems: "start",
          }}
        >
          {/* Compact: the box grows with what is written, so the reference a new
              note opens with sits at the END of the card, not above a blank
              stretch — see RichNoteEditor's minHeight. 96px is enough room for
              the placeholder to wrap onto a second line in a half-width card. */}
          {notes.map((note) => (
            <NoteCard key={note.id} {...notebook.cardProps(note)} editorMinHeight={96} />
          ))}
        </Box>
      )}

      {/* Mounted only while open, as in the notebook: its hooks fetch the
          lecture and the viewer's like/save state, which nobody asked for until
          a chip to another lesson is clicked. */}
      {preview && (
        <SourcePreviewDialog
          open
          onClose={notebook.closePreview}
          onCloseCurrent={notebook.closePreview}
          onCloseAll={notebook.closePreview}
          mediaId={preview.mediaId}
          timestampSeconds={preview.timestampSeconds}
          chunkId={preview.chunkId}
          pageNumber={preview.pageNumber}
          fallbackTitle={preview.mediaTitle}
          noteText={preview.noteText}
          // This page's slice holds only this lesson's bookmarks, so the other
          // lesson's list is empty here rather than wrong.
          bookmarks={(bookmarks ?? []).filter((b) => b.media_id === preview.mediaId)}
          trailPosition={1}
          trailLength={1}
          onPrev={null}
          onNext={null}
        />
      )}

      <UntitledNoteDialog
        open={notebook.titlePromptOpen}
        onCancel={notebook.cancelTitle}
        onSave={notebook.confirmTitle}
      />

      <ConfirmingDeletionDialog
        open={Boolean(notebook.deleteTarget)}
        onClose={notebook.cancelDelete}
        onConfirm={notebook.handleDeleteConfirm}
        message={`האם אתה בטוח שאתה מעוניין למחוק את ההערה "${notebook.deleteTarget?.title?.trim() || "ללא כותרת"}"?`}
      />
    </Paper>
  );
};

export default LessonNotebook;
