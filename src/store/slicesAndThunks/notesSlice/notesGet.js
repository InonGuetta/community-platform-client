import { createAsyncThunk } from "@reduxjs/toolkit";
import { notesApi } from "../../../api/notesApi";
import { rejectionOf } from "../../../utilities/apiError";

export const fetchNotes = createAsyncThunk("notes/fetch", async (_, { rejectWithValue }) => {
  try {
    return await notesApi.list();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch notes"));
  }
});
