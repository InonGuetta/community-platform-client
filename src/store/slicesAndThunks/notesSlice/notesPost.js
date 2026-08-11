import { createAsyncThunk } from "@reduxjs/toolkit";
import { notesApi } from "../../../api/notesApi";
import { rejectionOf } from "../../../utilities/apiError";

export const createNote = createAsyncThunk("notes/create", async (payload, { rejectWithValue }) => {
  try {
    return await notesApi.create(payload);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to create note"));
  }
});
