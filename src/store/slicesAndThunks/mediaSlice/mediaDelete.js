import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const deleteMedia = createAsyncThunk("media/delete", async (id, { rejectWithValue }) => {
  try {
    await axiosInstance.delete(`/media/delete/${id}`);
    return { id };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Delete failed");
  }
});
