import { createAsyncThunk } from "@reduxjs/toolkit";
import { mediaApi } from "../../../api/mediaApi";

export const updateMedia = createAsyncThunk("media/update", async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    return await mediaApi.update(id, payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Update failed");
  }
});
