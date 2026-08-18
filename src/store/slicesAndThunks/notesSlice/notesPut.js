import { createAsyncThunk } from "@reduxjs/toolkit";
import { notesApi } from "../../../api/notesApi";
import { rejectionOf } from "../../../utilities/apiError";
import { fetchNotes } from "./notesGet";

export const updateNote = createAsyncThunk("notes/update", async ({ id, title, body }, { rejectWithValue }) => {
  try {
    return await notesApi.update(id, { title, body });
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to update note"));
  }
});

// Dragging a note to a new place in the notebook.
//
// The slice applies the new order on `pending` — a drag has to land where it
// was dropped, immediately, or the gesture feels broken — which makes this the
// one thunk here that can leave the store ahead of the server. So a failure
// re-reads the list rather than only reporting itself: the alternative is a
// notebook that shows an order the next refresh will silently undo.
export const reorderNotes = createAsyncThunk("notes/reorder", async (ids, { dispatch, rejectWithValue }) => {
  try {
    return await notesApi.reorder(ids);
  } catch (err) {
    dispatch(fetchNotes());
    return rejectWithValue(rejectionOf(err, "Failed to reorder notes"));
  }
});
