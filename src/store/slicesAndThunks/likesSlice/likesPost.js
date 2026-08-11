import { createAsyncThunk } from "@reduxjs/toolkit";
import { likesApi } from "../../../api/likesApi";
import { rejectionOf } from "../../../utilities/apiError";

export const likeMedia = createAsyncThunk("likes/add", async (mediaId, { rejectWithValue }) => {
  try {
    await likesApi.add(mediaId);
    return { mediaId };
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to like"));
  }
});
