import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { useDispatch } from "react-redux";
import { deleteBookmark } from "../../../../store/slicesAndThunks/bookmarksSlice/bookmarksDelete";
import { updateBookmark } from "../../../../store/slicesAndThunks/bookmarksSlice/bookmarksPut";
import { formatTime } from "../../../../utilities/formatTime";
import { listRowSx } from "../../../../utilities/constant";
import Paper from "@mui/material/Paper";
import BookmarkAddOutlinedIcon from "@mui/icons-material/BookmarkAddOutlined";
import {
  isTextBookmark, isPageBookmark, isOrphaned, bookmarkLines,
} from "../../../../utilities/bookmarks";

// "Active" bookmark = the latest one whose timestamp is <= current playback.
// That's the one the user is "inside" right now.
//
// Meaningless for a book: there is no playhead, so nothing is "current". A
// bookmark in a book is skipped HERE rather than only by the caller passing
// isText, because this list is not always one media item's — the notebook's
// source window renders a lecture's bookmarks from a store holding every kind.
// Left to the caller, `null <= 0` matched every bookmark in a sefer and lit the
// last one up permanently — which is why the test below is "is it in a book",
// and not "does it have a char_position": a mark on a page of the original has
// no timestamp either, and would have walked straight back into that.
const inABook = (bookmark) => isTextBookmark(bookmark) || isPageBookmark(bookmark);

const findActiveBookmarkId = (bookmarks, currentTime) => {
  let activeId = null;
  for (const bm of bookmarks) {
    if (inABook(bm)) continue;
    if (bm.timestamp_seconds <= currentTime) activeId = bm.id;
    else break;
  }
  return activeId;
};

const NotesPanel = ({
  bookmarks = [],
  currentTime = 0,
  onCreateBookmark,
  onSeek,
  onSeekText,
  isText = false,
}) => {
  const dispatch = useDispatch();
  const [note, setNote] = useState("");

  // Which row is open for editing, and what is being typed into it. One at a
  // time: two rows in edit mode is two drafts, and the list is where the user
  // came to read rather than to write.
  //
  // Editing happens IN the row rather than in a dialog. The note is one line,
  // the surrounding rows are the context that makes it make sense, and a modal
  // would hide them to ask for a sentence.
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");

  const startEditing = (bookmark) => {
    setEditingId(bookmark.id);
    setDraft(bookmark.note ?? "");
  };
  const stopEditing = () => {
    setEditingId(null);
    setDraft("");
  };
  const commit = (bookmark) => {
    // Nothing changed — do not spend a request, and do not make the row flicker.
    if (draft.trim() === (bookmark.note ?? "").trim()) return stopEditing();
    dispatch(updateBookmark({ id: bookmark.id, note: draft.trim() }));
    stopEditing();
  };

  const handleCreate = () => {
    onCreateBookmark(Math.floor(currentTime), note);
    setNote("");
  };

  // bookmarks arrive in reading order — see utilities/bookmarks.js.
  const activeId = isText ? null : findActiveBookmarkId(bookmarks, Math.floor(currentTime));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="subtitle1" fontWeight={600}>סימניות והערות</Typography>

      {/* ── Where a bookmark is made ──────────────────────────────────────────
          A recording has a playhead, so "here" is a value this panel can read
          off it and the field below is the whole gesture.

          A book has no playhead. This form was still rendered for one, still
          labelled "בזמן הנוכחי", and still sent Math.floor(currentTime) — which
          on a book page is 0, always. Every press produced a bookmark at second
          zero of a document with no timeline: listed as "בזמן 0:00", impossible
          to jump to, and indistinguishable afterwards from a real one.

          A book is marked in the book. There was a draggable handle here for a
          while, to be carried onto a line of the extracted text; that view no
          longer exists, and a handle with nowhere to land is worse than no
          handle at all. The gesture now lives where the book is: select the
          words on the page and save. So this panel says where, and offers
          nothing it cannot deliver. */}
      {isText ? (
        <Paper variant="outlined" sx={{ display: "flex", alignItems: "center", gap: 1, p: 1 }}>
          <BookmarkAddOutlinedIcon fontSize="small" color="disabled" />
          <Typography variant="body2" color="text.secondary">
            לסימון: סמנו את השורה בספר ולחצו „שמירה”
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            label="הוסף הערה בזמן הנוכחי"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            size="small"
            fullWidth
            placeholder={`בזמן ${formatTime(Math.floor(currentTime))}`}
          />
          <Button variant="contained" onClick={handleCreate} startIcon={<BookmarkIcon />} sx={{ flexShrink: 0 }}>
            שמור
          </Button>
        </Box>
      )}

      <List dense disablePadding>
        {bookmarks.map((bm) => {
          const isActive = bm.id === activeId;
          // A bookmark whose paragraph was re-extracted away. It keeps its note
          // and its quoted words — that is the record of what the reader meant —
          // but there is nowhere left to send them, so the row says so instead
          // of being a click that does nothing.
          const orphaned = isOrphaned(bm);
          const { title, detail } = bookmarkLines(bm);
          const editing = editingId === bm.id;

          // While a row is being edited it is a form, not a link. Rendered as a
          // plain box so a click in the field cannot also fire the jump that
          // would scroll the reader away from what is being annotated.
          if (editing) {
            return (
              <Box
                key={bm.id}
                sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5, p: 1, borderRadius: 1, ...listRowSx }}
              >
                <TextField
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  size="small"
                  fullWidth
                  autoFocus
                  variant="standard"
                  placeholder="הערה"
                  // Labelled for what it IS, not for the action that opened it.
                  // The pencil is "עריכת ההערה"; giving the field the same words
                  // put two different controls behind one name — ambiguous to a
                  // screen reader, and to anything else looking one up.
                  inputProps={{ "aria-label": "הערה" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commit(bm); }
                    if (e.key === "Escape") { e.preventDefault(); stopEditing(); }
                  }}
                />
                <IconButton size="small" onClick={() => commit(bm)} aria-label="שמירת ההערה">
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={stopEditing} aria-label="ביטול העריכה">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          }

          return (
            <ListItemButton
              key={bm.id}
              // aria-disabled, NOT disabled. MUI's disabled sets pointer-events
              // none on the whole row, and the delete button lives inside it —
              // so a bookmark whose paragraph is gone would have become one that
              // cannot be tidied away either, which is the opposite of useful.
              aria-disabled={orphaned || undefined}
              // The whole bookmark for a book, a number of seconds for a
              // recording. The reader resolves the paragraph through chunk_id,
              // which only the row carries — an offset alone cannot say which
              // paragraph it belongs to once the book has been re-extracted.
              // The same is true of a mark on a page of the original, for the
              // same reason: the page and the rectangle travel together or the
              // click knows the page and not the place on it.
              onClick={() => {
                if (orphaned) return;
                if (inABook(bm)) onSeekText?.(bm);
                else onSeek?.(bm.timestamp_seconds);
              }}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                // Room for two controls now, not one.
                pr: 10,
                ...listRowSx,
                // Still legible: the row is not an error, it is a note whose
                // place is gone, and the words on it are the reason to keep it.
                ...(orphaned && { opacity: 0.65, cursor: "default" }),
                ...(isActive && {
                  bgcolor: "primary.light",
                  color: "primary.contrastText",
                  "&:hover": { bgcolor: "primary.main" },
                }),
              }}
            >
              <ListItemText
                primary={title}
                // A book has no clock. "בזמן 00:00" on every bookmark in a
                // sefer is worse than saying nothing, so the offset is described
                // as a place — by page where there is one — rather than dressed
                // up as a time. See placeLabel in utilities/bookmarks.js.
                secondary={detail}
                primaryTypographyProps={{
                  sx: {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                }}
                secondaryTypographyProps={{
                  sx: {
                    color: isActive ? "primary.contrastText" : "text.secondary",
                    opacity: isActive ? 0.85 : 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                }}
              />
              {/* Both controls, for every kind of bookmark: a note on a lecture
                  and a note on a line are the same words, and there is no reason
                  one of them should be correctable and the other not.

                  stopPropagation on each, because the row itself is a button
                  that jumps — pressing "edit" must not also scroll the reader
                  away from the thing being annotated. */}
              <Box
                sx={{
                  position: "absolute", right: 4, display: "flex",
                  color: isActive ? "primary.contrastText" : "inherit",
                }}
              >
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); startEditing(bm); }}
                  aria-label="עריכת ההערה"
                  sx={{ color: "inherit" }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); dispatch(deleteBookmark(bm.id)); }}
                  aria-label="מחיקת סימנייה"
                  sx={{ color: "inherit" }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
};

export default NotesPanel;
