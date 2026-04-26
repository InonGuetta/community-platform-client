import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const updateMedia = createAsyncThunk("media/update", async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.put(`/media/update/${id}`, payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Update failed");
  }
});
