import { createAsyncThunk } from "@reduxjs/toolkit";
import { bookmarksApi } from "../../../api/bookmarksApi";

export const deleteBookmark = createAsyncThunk("bookmarks/delete", async (id, { rejectWithValue }) => {
  try {
    await bookmarksApi.remove(id);
    return { id };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete bookmark");
  }
});
