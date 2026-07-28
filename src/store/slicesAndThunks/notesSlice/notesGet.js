import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const fetchNotes = createAsyncThunk("notes/fetch", async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get("/notes");
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch notes");
  }
});
