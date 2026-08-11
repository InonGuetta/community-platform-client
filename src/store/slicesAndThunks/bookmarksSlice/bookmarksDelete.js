import { createAsyncThunk } from "@reduxjs/toolkit";
import { bookmarksApi } from "../../../api/bookmarksApi";
import { rejectionOf } from "../../../utilities/apiError";

export const deleteBookmark = createAsyncThunk("bookmarks/delete", async (id, { rejectWithValue }) => {
  try {
    await bookmarksApi.remove(id);
    return { id };
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to delete bookmark"));
  }
});
