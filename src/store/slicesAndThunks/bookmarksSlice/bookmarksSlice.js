import { createSlice } from "@reduxjs/toolkit";
import { fetchBookmarks } from "./bookmarksGet";
import { createBookmark } from "./bookmarksPost";
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
      .addCase(fetchBookmarks.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; })

      .addCase(createBookmark.fulfilled, (state, action) => { state.items.push(action.payload); })

      .addCase(deleteBookmark.fulfilled, (state, action) => {
        state.items = state.items.filter((b) => b.id !== action.payload.id);
      });
  },
});

export const { clearBookmarks } = bookmarksSlice.actions;
export default bookmarksSlice.reducer;
