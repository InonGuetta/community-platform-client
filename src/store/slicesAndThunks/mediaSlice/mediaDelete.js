import { createAsyncThunk } from "@reduxjs/toolkit";
import { mediaApi } from "../../../api/mediaApi";

export const deleteMedia = createAsyncThunk("media/delete", async (id, { rejectWithValue }) => {
  try {
    await mediaApi.remove(id);
    return { id };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Delete failed");
  }
});
