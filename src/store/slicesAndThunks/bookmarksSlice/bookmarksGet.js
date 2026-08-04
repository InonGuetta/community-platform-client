import { createAsyncThunk } from "@reduxjs/toolkit";
import { bookmarksApi } from "../../../api/bookmarksApi";

export const fetchBookmarks = createAsyncThunk("bookmarks/fetch", async (mediaId, { rejectWithValue }) => {
  try {
    return await bookmarksApi.list(mediaId);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch bookmarks");
  }
});
