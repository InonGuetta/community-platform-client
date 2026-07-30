import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const createNote = createAsyncThunk("notes/create", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post("/notes", payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to create note");
  }
});
