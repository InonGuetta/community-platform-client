import { createAsyncThunk } from "@reduxjs/toolkit";
import { likesApi } from "../../../api/likesApi";
import { rejectionOf } from "../../../utilities/apiError";

export const unlikeMedia = createAsyncThunk("likes/remove", async (mediaId, { rejectWithValue }) => {
  try {
    await likesApi.remove(mediaId);
    return { mediaId };
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to unlike"));
  }
});
