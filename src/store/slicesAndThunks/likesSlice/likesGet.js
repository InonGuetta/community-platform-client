import { createAsyncThunk } from "@reduxjs/toolkit";
import { likesApi } from "../../../api/likesApi";
import { rejectionOf } from "../../../utilities/apiError";

// The likes page's own data: full media rows to render as cards.
export const fetchLikedMedia = createAsyncThunk("likes/fetchMedia", async (_, { rejectWithValue }) => {
  try {
    return await likesApi.list();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch liked media"));
  }
});

// Only the ids, for screens that render a like button and need to know whether
// it is already on — the media page today, and the archive cards later.
export const fetchLikedIds = createAsyncThunk("likes/fetchIds", async (_, { rejectWithValue }) => {
  try {
    return await likesApi.listIds();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch likes"));
  }
});
