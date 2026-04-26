import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const deleteBookmark = createAsyncThunk("bookmarks/delete", async (id, { rejectWithValue }) => {
  try {
    await axiosInstance.delete(`/bookmarks/${id}`);
    return { id };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete bookmark");
  }
});
