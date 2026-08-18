import { createSlice } from "@reduxjs/toolkit";
import { fetchNotes } from "./notesGet";
import { createNote } from "./notesPost";
import { updateNote, reorderNotes } from "./notesPut";
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
      .addCase(fetchNotes.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload?.message; })

      // New notes go to the top, which is where the server puts them too — see
      // the sort_order arithmetic in servicesNotes.createNote.
      .addCase(createNote.fulfilled, (state, action) => { state.items.unshift(action.payload); })

      // Applied on PENDING, not on fulfilled. A dragged note has to stay where
      // it was dropped: waiting for the round-trip means the card springs back
      // to its old place for as long as the request takes, which reads as a
      // drag that failed. The thunk re-fetches the list if the write is
      // refused, so the optimistic order cannot outlive a failure.
      //
      // Notes absent from the list keep their position and are appended in
      // their existing order — the page only ever sends the whole notebook, but
      // a reorder built from a filtered view must not drop the rest of it.
      .addCase(reorderNotes.pending, (state, action) => {
        const position = new Map(action.meta.arg.map((id, index) => [id, index]));
        state.items.sort((a, b) =>
          (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        );
      })
      .addCase(reorderNotes.rejected, (state, action) => { state.error = action.payload?.message; })

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
