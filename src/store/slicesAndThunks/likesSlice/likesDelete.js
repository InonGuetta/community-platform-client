import { createAsyncThunk } from "@reduxjs/toolkit";
import { likesApi } from "../../../api/likesApi";

export const unlikeMedia = createAsyncThunk("likes/remove", async (mediaId, { rejectWithValue }) => {
  try {
    await likesApi.remove(mediaId);
    return { mediaId };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to unlike");
  }
});
