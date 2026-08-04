import { createAsyncThunk } from "@reduxjs/toolkit";
import { likesApi } from "../../../api/likesApi";

export const likeMedia = createAsyncThunk("likes/add", async (mediaId, { rejectWithValue }) => {
  try {
    await likesApi.add(mediaId);
    return { mediaId };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to like");
  }
});
