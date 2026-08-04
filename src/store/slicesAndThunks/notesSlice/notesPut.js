import { createAsyncThunk } from "@reduxjs/toolkit";
import { notesApi } from "../../../api/notesApi";

export const updateNote = createAsyncThunk("notes/update", async ({ id, title, body }, { rejectWithValue }) => {
  try {
    return await notesApi.update(id, { title, body });
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update note");
  }
});
