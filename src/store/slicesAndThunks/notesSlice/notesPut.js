import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const updateNote = createAsyncThunk("notes/update", async ({ id, title, body }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.put(`/notes/${id}`, { title, body });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update note");
  }
});
