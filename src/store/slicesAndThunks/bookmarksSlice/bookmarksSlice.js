import { createSlice } from "@reduxjs/toolkit";
import { fetchBookmarks } from "./bookmarksGet";
import { createBookmark } from "./bookmarksPost";
import { updateBookmark } from "./bookmarksPut";
import { deleteBookmark } from "./bookmarksDelete";
import { statuses } from "../../../utilities/constant";

const bookmarksSlice = createSlice({
  name: "bookmarks",
  initialState: { items: [], status: statuses.idle, error: null },
  reducers: {
    clearBookmarks(state) { state.items = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookmarks.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchBookmarks.fulfilled, (state, action) => { state.status = statuses.succeeded; state.items = action.payload; })
      .addCase(fetchBookmarks.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload?.message; })

      .addCase(createBookmark.fulfilled, (state, action) => { state.items.push(action.payload); })

      // Replaced in place rather than pushed. The server returns the same shape
      // createBookmark does — media_title and media_type included — so the row
      // the notebook groups by does not lose its lecture on an edit.
      .addCase(updateBookmark.fulfilled, (state, action) => {
        const at = state.items.findIndex((b) => b.id === action.payload.id);
        if (at !== -1) state.items[at] = action.payload;
      })
      .addCase(updateBookmark.rejected, (state, action) => { state.error = action.payload?.message; })

      .addCase(deleteBookmark.fulfilled, (state, action) => {
        state.items = state.items.filter((b) => b.id !== action.payload.id);
      });
  },
});

export const { clearBookmarks } = bookmarksSlice.actions;
export default bookmarksSlice.reducer;
