import { createSlice } from "@reduxjs/toolkit";
import { fetchNotes } from "./notesGet";
import { createNote } from "./notesPost";
import { updateNote } from "./notesPut";
import { deleteNote } from "./notesDelete";
import { statuses } from "../../../utilities/constant";

const notesSlice = createSlice({
  name: "notes",
  initialState: { items: [], status: statuses.idle, error: null },
  reducers: {
    clearNotes(state) { state.items = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotes.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchNotes.fulfilled, (state, action) => { state.status = statuses.succeeded; state.items = action.payload; })
      .addCase(fetchNotes.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; })

      // New notes go to the top — the list is ordered newest-first.
      .addCase(createNote.fulfilled, (state, action) => { state.items.unshift(action.payload); })

      .addCase(updateNote.fulfilled, (state, action) => {
        const idx = state.items.findIndex((n) => n.id === action.payload.id);
        if (idx !== -1) {
          // Preserve media_title (the PUT response doesn't re-join media).
          state.items[idx] = { ...state.items[idx], ...action.payload };
        }
      })

      .addCase(deleteNote.fulfilled, (state, action) => {
        state.items = state.items.filter((n) => n.id !== action.payload.id);
      });
  },
});

export const { clearNotes } = notesSlice.actions;
export default notesSlice.reducer;
