import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import StatusBadge from "../../../features/StatusBadge/StatusBadge";
import NoteCard from "../../../features/Notes/NoteCard";
import NoteToolbar from "../../../features/Notes/NoteToolbar";
import SourcePreviewDialog from "./SourcePreviewDialog";
import UntitledNoteDialog from "../../../features/Notes/UntitledNoteDialog";
import ConfirmingDeletionDialog from "../../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import { NOTEBOOK_SHELF } from "../../../layout/personalShelves";
import useLessonNotebook from "../useLessonNotebook";
import { useTranslation } from "react-i18next";

// The notebook strip under a lesson: every note taken on it or quoting it, open
// for editing in place, with the same cards, toolbar and source window as
// /notebook. See useLessonNotebook for what belongs here and why a chip for this
// lesson moves the player instead of opening a window.
const LessonNotebook = ({ media, isText, currentTime, readerPage, bookmarks, onSeek, onJumpTo }) => {
  const { t } = useTranslation("lesson");
  const notebook = useLessonNotebook({ media, isText, currentTime, readerPage, bookmarks, onSeek, onJumpTo });
  const { notes, loading, preview } = notebook;

  return (
    // Redesign v4 (screens 20, 26): a section card under the lesson — the
    // theme's Paper is the card (D-51) — with a display heading and the two
    // actions at the end of its row, which drop under it on a phone.
    <Paper data-testid="lesson-notebook" sx={{ mt: 4, p: { xs: 3, md: 4 } }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography variant="display" component="h2" sx={{ fontSize: 26 }}>
            {t("notebook.title")}
          </Typography>
          {notes.length > 0 && <StatusBadge tone="neutral">{notes.length}</StatusBadge>}
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button component={RouterLink} to={NOTEBOOK_SHELF.path} variant="soft">
            {t("notebook.all")}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={notebook.handleCreate}>
            {t("notebook.newNote")}
          </Button>
        </Box>
      </Box>

      {/* Only when there is a card to format — a strip of disabled buttons
          over an empty notebook is noise on a page that is about the lesson. */}
      {notes.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
          <NoteToolbar
            onCommand={notebook.execCommand}
            onFontSize={notebook.setFontSize}
            formats={notebook.formats}
            disabled={!notebook.activeNoteId}
          />
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={28} /></Box>
      ) : notes.length === 0 ? (
        <Typography sx={{ fontSize: 15, color: "text.secondary" }}>
          {t("notebook.empty")}
        </Typography>
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
        message={t("notebook.deleteQuestion", { title: notebook.deleteTarget?.title?.trim() || t("notebook.untitled") })}
      />
    </Paper>
  );
};

export default LessonNotebook;
