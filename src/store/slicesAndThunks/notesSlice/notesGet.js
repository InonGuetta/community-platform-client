import { createAsyncThunk } from "@reduxjs/toolkit";
import { notesApi } from "../../../api/notesApi";

export const fetchNotes = createAsyncThunk("notes/fetch", async (_, { rejectWithValue }) => {
  try {
    return await notesApi.list();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch notes");
  }
});
