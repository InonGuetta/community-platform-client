import { createAsyncThunk } from "@reduxjs/toolkit";
import { bookmarksApi } from "../../../api/bookmarksApi";

export const createBookmark = createAsyncThunk("bookmarks/create", async (payload, { rejectWithValue }) => {
  try {
    return await bookmarksApi.create(payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to create bookmark");
  }
});
