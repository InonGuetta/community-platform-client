import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import NoteCard from "../../../features/Notes/NoteCard";
import { statuses } from "../../../../utilities/constant";
import { useTranslation } from "react-i18next";
import { RADIUS } from "../../../../theme/tokens";

// The notes themselves, one NoteCard each in the index's order, and what the
// column shows while there are none. Layout only — every value and handler is
// useNotebookPageController's, handed down by NotebookPage.
const NotesColumn = ({
  activeNoteId,
  cardNodes,
  draftFor,
  onNeedBody,
  editorApis,
  filtered,
  isDirty,
  items,
  openSource,
  renameSource,
  reportEditorWarning,
  requestSave,
  selectedIds,
  setActiveNoteId,
  setDeleteTargets,
  setDrafts,
  setFormats,
  status,
}) => {
  const { t } = useTranslation("notebook");
  return (
  <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
    {status === statuses.loading && items.length === 0 ? (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
    ) : filtered.length === 0 ? (
      // The empty column in the design's empty-state language (component 14):
      // the dashed frame and the accent icon tile. The words are a sentence,
      // not a headline, so they are the text and there is no display title.
      <Box
        sx={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 2, minHeight: 360, px: 3, textAlign: "center",
          borderRadius: `${RADIUS.hero}px`, border: "2px dashed", borderColor: "surface.lineStrong",
          bgcolor: "surface.wash",
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            width: 64, height: 64, borderRadius: `${RADIUS.emptyIcon}px`,
            bgcolor: "surface.accentSoft", color: "primary.main",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <NoteAltOutlinedIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography sx={{ fontSize: 16, color: "text.secondary", maxWidth: 448 }}>
          {items.length === 0 ? t("noNotes") : t("noMatchingNotes")}
        </Typography>
      </Box>
    ) : (
      filtered.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          draft={draftFor(note.id)}
          onNeedBody={onNeedBody}
          isDirty={isDirty(note.id)}
          isActive={note.id === activeNoteId}
          isSelected={selectedIds.has(note.id)}
          // Callback refs, so a card that leaves the list takes its entry
          // with it instead of leaving a handle to a dead editor behind.
          editorRef={(api) => {
            if (api) editorApis.current.set(note.id, api);
            else editorApis.current.delete(note.id);
          }}
          cardRef={(node) => {
            if (node) cardNodes.current.set(note.id, node);
            else cardNodes.current.delete(note.id);
          }}
          onDraftChange={(draft) => setDrafts((prev) => ({ ...prev, [note.id]: draft }))}
          onFormatsChange={setFormats}
          onFocus={() => setActiveNoteId(note.id)}
          // A paste that could not be embedded — an image over the size
          // cap, a file that would not read. Silence would look like a
          // paste that simply did nothing.
          onError={reportEditorWarning}
          onSave={() => requestSave(note)}
          onDelete={() => setDeleteTargets([note])}
          onOpenSource={openSource}
          // The pencil on a chip that is a bookmark renames the bookmark.
          onRenameSource={renameSource}
          // A bookmark dropped anywhere on the card is written into the
          // note's body at the point it landed. The card owns the drop
          // (it is the target the user aims at); the editor owns the
          // caret, and this is the one line that joins them.
          onDropSource={(bookmark, point) => {
            editorApis.current.get(note.id)?.insertSource(bookmark, point);
            setActiveNoteId(note.id);
          }}
        />
      ))
    )}
  </Box>
  );
};

export default NotesColumn;
