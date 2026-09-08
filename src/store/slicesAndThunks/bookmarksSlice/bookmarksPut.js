import { createAsyncThunk } from "@reduxjs/toolkit";
import { bookmarksApi } from "../../../api/bookmarksApi";
import { rejectionOf } from "../../../utilities/apiError";

// Editing what a bookmark SAYS. Where it points is not editable — see
// bookmarksApi.update for why.
export const updateBookmark = createAsyncThunk(
  "bookmarks/update",
  async ({ id, note }, { rejectWithValue }) => {
    try {
      return await bookmarksApi.update(id, note);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to update bookmark"));
    }
  }
);
