import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import NoteCard from "../../../features/Notes/NoteCard";
import { statuses } from "../../../../utilities/constant";

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
}) => (
  <Box
    sx={{
      flexGrow: 1, minWidth: 0, minHeight: 0,
      display: "flex", flexDirection: "column", gap: 2,
      overflowY: { md: "auto" },
      // Room for the scrollbar so it does not sit on the cards' edge.
      pl: { md: 1 },
    }}
  >
    {status === statuses.loading && items.length === 0 ? (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
    ) : filtered.length === 0 ? (
      <Paper elevation={0} sx={{ flexGrow: 1, p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "text.secondary", minHeight: 400 }}>
        <NoteAltOutlinedIcon sx={{ fontSize: 64, opacity: 0.4 }} />
        <Typography>
          {items.length === 0 ? "עדיין אין הערות. צור הערה חדשה כדי להתחיל." : "אין הערות התואמות את החיפוש."}
        </Typography>
      </Paper>
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

export default NotesColumn;
