import { createAsyncThunk } from "@reduxjs/toolkit";
import { notesApi } from "../../../api/notesApi";
import { rejectionOf } from "../../../utilities/apiError";

export const updateNote = createAsyncThunk("notes/update", async ({ id, title, body }, { rejectWithValue }) => {
  try {
    return await notesApi.update(id, { title, body });
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to update note"));
  }
});
