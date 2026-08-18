import { createAsyncThunk } from "@reduxjs/toolkit";
import { mediaApi } from "../../../api/mediaApi";
import { rejectionOf } from "../../../utilities/apiError";

export const fetchAllMedia = createAsyncThunk("media/fetchAll", async (filters = {}, { rejectWithValue }) => {
  try {
    return await mediaApi.getAll(filters);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch media"));
  }
});

// Its own state in the slice rather than sharing `items` with the archive: both
// are lists of media rows, but the archive is loaded and reloaded by the archive
// page's own filters, and a shelf that borrowed that array would be emptied the
// first time the user searched.
export const fetchContinueWatching = createAsyncThunk("media/continueWatching", async (_, { rejectWithValue }) => {
  try {
    return await mediaApi.continueWatching();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch continue watching"));
  }
});

export const fetchOneMedia = createAsyncThunk("media/fetchOne", async (id, { rejectWithValue }) => {
  try {
    return await mediaApi.getOne(id);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch media item"));
  }
});
