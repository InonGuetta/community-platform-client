import { createAsyncThunk } from "@reduxjs/toolkit";
import { bookmarksApi } from "../../../api/bookmarksApi";
import { rejectionOf } from "../../../utilities/apiError";

export const createBookmark = createAsyncThunk("bookmarks/create", async (payload, { rejectWithValue }) => {
  try {
    return await bookmarksApi.create(payload);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to create bookmark"));
  }
});
