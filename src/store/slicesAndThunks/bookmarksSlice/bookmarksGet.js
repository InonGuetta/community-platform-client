import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const fetchBookmarks = createAsyncThunk("bookmarks/fetch", async (mediaId, { rejectWithValue }) => {
  try {
    const params = mediaId ? { mediaId } : {};
    const { data } = await axiosInstance.get("/bookmarks", { params });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch bookmarks");
  }
});
