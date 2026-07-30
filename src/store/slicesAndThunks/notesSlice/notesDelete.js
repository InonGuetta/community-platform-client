import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const deleteNote = createAsyncThunk("notes/delete", async (id, { rejectWithValue }) => {
  try {
    await axiosInstance.delete(`/notes/${id}`);
    return { id };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete note");
  }
});
