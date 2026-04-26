import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const createBookmark = createAsyncThunk("bookmarks/create", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post("/bookmarks", payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to create bookmark");
  }
});
