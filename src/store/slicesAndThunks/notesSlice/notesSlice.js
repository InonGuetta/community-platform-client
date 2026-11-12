import { createSlice } from "@reduxjs/toolkit";
import { fetchNotes, fetchNoteBodies, fetchNotesAboutMedia } from "./notesGet";
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
      // The list is light (PRD NOTE-17): no body. A note whose body this page
      // already holds keeps it — as long as the note has not changed since —
      // so a refetch (after a reorder, on returning to the page) does not throw
      // every open editor back to its preview and load it all again.
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.status = statuses.succeeded;
        const held = new Map(state.items.filter((n) => typeof n.body === "string").map((n) => [n.id, n]));
        state.items = action.payload.map((light) => {
          const whole = held.get(light.id);
          return whole && whole.updated_at === light.updated_at ? { ...light, body: whole.body } : light;
        });
      })

      .addCase(fetchNoteBodies.fulfilled, (state, action) => {
        const bodies = new Map(action.payload.map((n) => [n.id, n.body]));
        for (const note of state.items) {
          if (bodies.has(note.id)) note.body = bodies.get(note.id);
        }
      })

      .addCase(fetchNotesAboutMedia.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchNotesAboutMedia.fulfilled, (state, action) => {
        state.status = statuses.succeeded;
        state.items = action.payload;
      })
      .addCase(fetchNotesAboutMedia.rejected, (state, action) => {
        state.status = statuses.failed;
        state.error = action.payload?.message;
      })
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
