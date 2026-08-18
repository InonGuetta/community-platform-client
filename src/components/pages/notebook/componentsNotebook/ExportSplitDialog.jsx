import { useEffect, useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import ToggleButton from "@mui/material/ToggleButton";
import CircularProgress from "@mui/material/CircularProgress";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DialogTitle from "../../../features/Dialogs/DialogTitle";
import DialogContent from "../../../features/Dialogs/DialogContent";
import DialogActions from "../../../features/Dialogs/DialogActions";
import { dropIndicatorSx, hasDragType } from "./useDragReorder";

// Splitting an export across several documents.
//
// The plain export writes the ticked notes into one file in the order the page
// shows them, which is the common case and stays one click. This is the other
// one: ten notes that are really three subjects, and the user wants three files
// — with the notes divided as they choose and ordered inside each.
//
// Everything here is a plan, not an export. The dialog produces a list of
// notebooks and hands it back; the page is what writes the files. That keeps the
// arrangement editable up to the last moment and means nothing has been written
// to the user's disk if they close it.
//
// Two ways to move a note, and both are needed rather than one being a fallback:
// dragging is how anyone actually rearranges a list, and the arrows and the
// number box are how the same thing is done from a keyboard — which a drag
// cannot be.

const MAX_NOTEBOOKS = 10;

// Its own type, not the notebook's. The two drags look identical to the browser
// and neither should ever be mistaken for the other: a row dragged in here
// rearranges a plan for some files, and a card dragged out there rewrites the
// user's notebook in the database.
const PLAN_DRAG_MIME = "application/x-community-export-note";

const noteLabel = (note) => note?.title?.trim() || "(ללא כותרת)";

const ExportSplitDialog = ({ open, notes, exporting, onClose, onExport }) => {
  const [format, setFormat] = useState("word");
  const [books, setBooks] = useState([]);

  // What the pointer is carrying and where it is hovering. `overBook` is what
  // makes an EMPTY notebook a place you can drop into — with only row targets,
  // the one thing the user most wants to drag INTO would be the one thing they
  // could not reach.
  const [dragNoteId, setDragNoteId] = useState(null);
  const [marker, setMarker] = useState(null);
  const [overBook, setOverBook] = useState(null);

  // Reset when the SELECTION changes, not when the array holding it does.
  //
  // The page rebuilds that array whenever anything about the notebook changes —
  // a note saved, a background refetch — and keying the reset on its identity
  // meant a plan the user was halfway through arranging could be wiped by an
  // event they never caused and cannot see. What actually invalidates a plan is
  // a different set of notes being exported, which is what this watches.
  const selectionKey = notes.map((note) => note.id).join(",");
  useEffect(() => {
    if (!open) return;
    setBooks([
      { name: "מחברת 1", noteIds: selectionKey ? selectionKey.split(",").map(Number) : [] },
      { name: "מחברת 2", noteIds: [] },
    ]);
  }, [open, selectionKey]);

  const byId = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);

  const clearDrag = () => { setDragNoteId(null); setMarker(null); setOverBook(null); };

  /**
   * Move one note into `toBook`, at `at` — or to the end when `at` is null.
   *
   * It is taken out of wherever it was BEFORE the destination index is read,
   * which is what makes a move within one notebook land where it was aimed:
   * counting against the old array leaves the note still occupying a slot ahead
   * of the target, and everything below the gap ends up one place off.
   */
  const relocate = (noteId, toBook, at) => setBooks((prev) => {
    const stripped = prev.map((book) => ({ ...book, noteIds: book.noteIds.filter((id) => id !== noteId) }));
    const ids = [...stripped[toBook].noteIds];
    ids.splice(at === null ? ids.length : Math.max(0, Math.min(at, ids.length)), 0, noteId);
    stripped[toBook] = { ...stripped[toBook], noteIds: ids };
    return stripped;
  });

  const move = (bookIndex, noteId, delta) => setBooks((prev) => prev.map((book, index) => {
    if (index !== bookIndex) return book;
    const ids = [...book.noteIds];
    const at = ids.indexOf(noteId);
    const to = at + delta;
    if (at === -1 || to < 0 || to >= ids.length) return book;
    [ids[at], ids[to]] = [ids[to], ids[at]];
    return { ...book, noteIds: ids };
  }));

  const rename = (bookIndex, name) =>
    setBooks((prev) => prev.map((book, index) => (index === bookIndex ? { ...book, name } : book)));

  // Removing notebooks must not remove notes. Whatever was in the ones that go
  // moves into the last one that stays, in the order it was already in.
  const setCount = (count) => setBooks((prev) => {
    if (count === prev.length) return prev;
    if (count > prev.length) {
      return [
        ...prev,
        ...Array.from({ length: count - prev.length }, (_, i) => ({
          name: `מחברת ${prev.length + i + 1}`,
          noteIds: [],
        })),
      ];
    }
    const orphans = prev.slice(count).flatMap((book) => book.noteIds);
    return prev.slice(0, count).map((book, index) => (
      index === count - 1 ? { ...book, noteIds: [...book.noteIds, ...orphans] } : book
    ));
  });

  const plan = books
    .map((book, index) => ({
      name: book.name.trim() || `מחברת ${index + 1}`,
      notes: book.noteIds.map((id) => byId.get(id)).filter(Boolean),
    }))
    .filter((book) => book.notes.length > 0);

  // A row is both a thing to pick up and a place to drop: the two halves of it
  // mean "above this note" and "below it".
  const rowDragProps = (bookIndex, noteId) => ({
    draggable: true,
    onDragStart: (event) => {
      // Firefox starts no drag at all unless the payload is set here.
      event.dataTransfer.setData(PLAN_DRAG_MIME, String(noteId));
      event.dataTransfer.effectAllowed = "move";
      setDragNoteId(noteId);
    },
    onDragEnd: clearDrag,
    onDragOver: (event) => {
      if (!hasDragType(event.dataTransfer, PLAN_DRAG_MIME)) return;
      event.preventDefault();
      event.stopPropagation();
      const box = event.currentTarget.getBoundingClientRect();
      const place = event.clientY < box.top + box.height / 2 ? "before" : "after";
      setOverBook(null);
      setMarker((prev) => (prev?.noteId === noteId && prev.place === place ? prev : { noteId, place }));
    },
    onDrop: (event) => {
      if (!hasDragType(event.dataTransfer, PLAN_DRAG_MIME)) return;
      event.preventDefault();
      event.stopPropagation();

      const dropped = Number(event.dataTransfer.getData(PLAN_DRAG_MIME)) || dragNoteId;
      const box = event.currentTarget.getBoundingClientRect();
      const after = event.clientY >= box.top + box.height / 2;

      // Read against the list the note has already left, for the reason spelled
      // out on relocate.
      const remaining = books[bookIndex].noteIds.filter((id) => id !== dropped);
      const at = remaining.indexOf(noteId);
      clearDrag();
      if (dropped) relocate(dropped, bookIndex, at === -1 ? null : at + (after ? 1 : 0));
    },
  });

  // The panel itself accepts a drop too, which is how a note reaches an empty
  // notebook and how it is sent to the end of a full one.
  const panelDropProps = (bookIndex) => ({
    onDragOver: (event) => {
      if (!hasDragType(event.dataTransfer, PLAN_DRAG_MIME)) return;
      event.preventDefault();
      setMarker(null);
      setOverBook(bookIndex);
    },
    onDragLeave: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOverBook(null);
    },
    onDrop: (event) => {
      if (!hasDragType(event.dataTransfer, PLAN_DRAG_MIME)) return;
      event.preventDefault();
      const dropped = Number(event.dataTransfer.getData(PLAN_DRAG_MIME)) || dragNoteId;
      clearDrag();
      if (dropped) relocate(dropped, bookIndex, null);
    },
  });

  return (
    <Dialog open={open} onClose={exporting ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle onClose={exporting ? undefined : onClose}>פיצול הייצוא למספר מחברות</DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* The controls, all of them together at the start of the line.

            They used to be spread across the full width with the drag hint
            pushed to the far end by an auto margin — which does not do in RTL
            what it does in LTR, so the hint floated in the middle of a large
            empty gap and wrapped onto a line of its own at some widths. A row
            of controls does not have to fill the dialog; it has to read as one
            group, and the instruction about the panels below now sits above
            the panels below. */}
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 1 }}>
          <TextField
            select
            size="small"
            label="כמה מחברות"
            value={books.length || 2}
            onChange={(e) => setCount(Number(e.target.value))}
            sx={{ minWidth: 150 }}
          >
            {Array.from({ length: Math.min(MAX_NOTEBOOKS, Math.max(2, notes.length)) }, (_, i) => i + 1).map((count) => (
              <MenuItem key={count} value={count}>{count}</MenuItem>
            ))}
          </TextField>

          {/* Two standalone buttons rather than a ToggleButtonGroup.

              The group draws its children as one merged control by making the
              seam between them transparent — using physical left/right borders
              and radii. Under RTL the visual order is mirrored but those rules
              are not, so the transparent edge lands on the OUTER side of the
              last button: PDF was drawn as three sides of a box with its left
              edge missing. Ungrouped, each button owns a complete border in
              both directions, and the pair still reads as two choices. */}
          <Box role="group" aria-label="פורמט הייצוא" sx={{ display: "flex", gap: 0.75 }}>
            <ToggleButton
              value="word"
              size="small"
              selected={format === "word"}
              onChange={() => setFormat("word")}
              sx={{ borderRadius: 1.5, px: 1.5, fontWeight: 700 }}
            >
              <DescriptionOutlinedIcon fontSize="small" sx={{ ml: 0.5 }} /> Word
            </ToggleButton>
            <ToggleButton
              value="pdf"
              size="small"
              selected={format === "pdf"}
              onChange={() => setFormat("pdf")}
              sx={{ borderRadius: 1.5, px: 1.5, fontWeight: 700 }}
            >
              <PictureAsPdfOutlinedIcon fontSize="small" sx={{ ml: 0.5 }} /> PDF
            </ToggleButton>
          </Box>

          {/* The two formats are not the same document and the difference is
              worth knowing BEFORE choosing — see utilities/notesExport.js. */}
          <Typography variant="caption" color="text.secondary">
            {format === "word" ? "עם העיצוב והתמונות" : "טקסט בלבד, ללא עיצוב ותמונות"}
          </Typography>
        </Box>

        {/* Next to what it describes, rather than in the header. */}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
          ↔ גרור הערה בין המחברות, או למעלה ולמטה בתוך מחברת
        </Typography>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(auto-fit, minmax(340px, 1fr))" } }}>
          {books.map((book, bookIndex) => (
            <Paper
              key={bookIndex}
              elevation={0}
              {...panelDropProps(bookIndex)}
              sx={{
                p: 2, borderRadius: 3, display: "flex", flexDirection: "column", gap: 1,
                border: "2px dashed",
                borderColor: overBook === bookIndex ? "primary.main" : "transparent",
                outline: "1px solid",
                outlineColor: "divider",
                outlineOffset: "-1px",
                bgcolor: overBook === bookIndex ? "action.hover" : "transparent",
                transition: "border-color 0.15s, background-color 0.15s",
              }}
            >
              <TextField
                value={book.name}
                onChange={(e) => rename(bookIndex, e.target.value)}
                size="small"
                variant="standard"
                // The name is also the file name, so this is the one field in
                // the dialog whose value the user will see again afterwards.
                label={`שם הקובץ (${book.noteIds.length} הערות)`}
                InputProps={{ sx: { fontWeight: 700 } }}
              />

              {book.noteIds.length === 0 ? (
                <Typography
                  variant="caption"
                  color={overBook === bookIndex ? "primary.main" : "text.secondary"}
                  sx={{ py: 3, textAlign: "center" }}
                >
                  {overBook === bookIndex ? "שחרר כאן" : "ריקה — גרור לכאן הערות, או שלא ייווצר עבורה קובץ"}
                </Typography>
              ) : book.noteIds.map((noteId, position) => (
                <Box
                  key={noteId}
                  {...rowDragProps(bookIndex, noteId)}
                  sx={{
                    display: "flex", alignItems: "flex-start", gap: 0.5,
                    borderRadius: 2, p: 0.5, bgcolor: "action.hover",
                    cursor: "grab",
                    "&:active": { cursor: "grabbing" },
                    opacity: dragNoteId === noteId ? 0.4 : 1,
                    ...dropIndicatorSx(marker?.noteId === noteId && dragNoteId !== noteId ? marker.place : null),
                  }}
                >
                  <DragIndicatorIcon aria-hidden fontSize="small" sx={{ opacity: 0.35, mt: 0.5 }} />
                  <Chip size="small" label={position + 1} sx={{ height: 20, fontSize: "0.65rem", mt: 0.5 }} />

                  {/* The whole title, wrapped — NOT truncated. A row of notes
                      called "בדיקה 01" and "בדיקה 02" is readable either way,
                      but a real notebook's titles are sentences, and an
                      ellipsis in the one place the user is deciding WHICH note
                      goes where makes the decision by guesswork. */}
                  <Typography
                    variant="body2"
                    sx={{ flexGrow: 1, minWidth: 0, py: 0.75, wordBreak: "break-word" }}
                  >
                    {noteLabel(byId.get(noteId))}
                  </Typography>

                  <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <Tooltip title="הזזה למעלה">
                      <span>
                        <IconButton size="small" disabled={position === 0} onClick={() => move(bookIndex, noteId, -1)}
                          aria-label={`הזזת ${noteLabel(byId.get(noteId))} למעלה`}>
                          <KeyboardArrowUpIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="הזזה למטה">
                      <span>
                        <IconButton size="small" disabled={position === book.noteIds.length - 1} onClick={() => move(bookIndex, noteId, 1)}
                          aria-label={`הזזת ${noteLabel(byId.get(noteId))} למטה`}>
                          <KeyboardArrowDownIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <TextField
                      select
                      size="small"
                      variant="standard"
                      value={bookIndex}
                      onChange={(e) => relocate(noteId, Number(e.target.value), null)}
                      sx={{ width: 56 }}
                      inputProps={{ "aria-label": `המחברת של ${noteLabel(byId.get(noteId))}` }}
                    >
                      {books.map((_, index) => (
                        <MenuItem key={index} value={index}>{index + 1}</MenuItem>
                      ))}
                    </TextField>
                  </Box>
                </Box>
              ))}
            </Paper>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ mr: "auto" }}>
          {`${plan.length} קבצים · ${notes.length} הערות`}
        </Typography>
        <Button onClick={onClose} variant="outlined" disabled={exporting}>ביטול</Button>
        <Button
          onClick={() => onExport(plan, format)}
          variant="contained"
          disabled={exporting || plan.length === 0}
          startIcon={exporting ? <CircularProgress size={18} /> : null}
        >
          {exporting ? "מייצא..." : `ייצוא ${plan.length} קבצים`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportSplitDialog;
