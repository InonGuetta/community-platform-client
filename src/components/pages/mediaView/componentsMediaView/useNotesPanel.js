import { useState } from "react";
import { useDispatch } from "react-redux";
import { deleteBookmark } from "../../../../store/slicesAndThunks/bookmarksSlice/bookmarksDelete";
import { updateBookmark } from "../../../../store/slicesAndThunks/bookmarksSlice/bookmarksPut";

// What the bookmarks list does — a new bookmark at the playhead, renaming one
// in its row, deleting one — so that NotesPanel.jsx is layout only.
/**
 * @param {{ currentTime?: number, onCreateBookmark?: (seconds: number, note: string) => void }} props
 */
export const useNotesPanel = ({ currentTime = 0, onCreateBookmark }) => {
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

  const removeBookmark = (id) => dispatch(deleteBookmark(id));

  return { note, setNote, editingId, draft, setDraft, startEditing, stopEditing, commit, handleCreate, removeBookmark };
};
