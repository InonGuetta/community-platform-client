import { createAsyncThunk } from "@reduxjs/toolkit";
import { mediaApi } from "../../../api/mediaApi";

export const fetchAllMedia = createAsyncThunk("media/fetchAll", async (filters = {}, { rejectWithValue }) => {
  try {
    return await mediaApi.getAll(filters);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch media");
  }
});

export const fetchOneMedia = createAsyncThunk("media/fetchOne", async (id, { rejectWithValue }) => {
  try {
    return await mediaApi.getOne(id);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch media item");
  }
});
