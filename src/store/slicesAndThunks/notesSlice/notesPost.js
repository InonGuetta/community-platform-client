import { createAsyncThunk } from "@reduxjs/toolkit";
import { notesApi } from "../../../api/notesApi";

export const createNote = createAsyncThunk("notes/create", async (payload, { rejectWithValue }) => {
  try {
    return await notesApi.create(payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to create note");
  }
});
