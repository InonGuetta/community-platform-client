import { createAsyncThunk } from "@reduxjs/toolkit";
import { notesApi } from "../../../api/notesApi";
import { rejectionOf } from "../../../utilities/apiError";

export const deleteNote = createAsyncThunk("notes/delete", async (id, { rejectWithValue }) => {
  try {
    await notesApi.remove(id);
    return { id };
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to delete note"));
  }
});
