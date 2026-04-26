import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const uploadMedia = createAsyncThunk("media/upload", async (formData, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Upload failed");
  }
});
