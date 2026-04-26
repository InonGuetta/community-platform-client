import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const updateUser = createAsyncThunk("users/update", async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.put(`/users/update-user/${id}`, payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update user");
  }
});
