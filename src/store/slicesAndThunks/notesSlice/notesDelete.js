import { createAsyncThunk } from "@reduxjs/toolkit";
import { notesApi } from "../../../api/notesApi";

export const deleteNote = createAsyncThunk("notes/delete", async (id, { rejectWithValue }) => {
  try {
    await notesApi.remove(id);
    return { id };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete note");
  }
});
