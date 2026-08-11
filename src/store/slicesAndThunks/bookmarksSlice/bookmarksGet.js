import { createAsyncThunk } from "@reduxjs/toolkit";
import { bookmarksApi } from "../../../api/bookmarksApi";
import { rejectionOf } from "../../../utilities/apiError";

export const fetchBookmarks = createAsyncThunk("bookmarks/fetch", async (mediaId, { rejectWithValue }) => {
  try {
    return await bookmarksApi.list(mediaId);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch bookmarks"));
  }
});
