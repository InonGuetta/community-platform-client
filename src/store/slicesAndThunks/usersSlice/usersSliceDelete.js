import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const deleteUser = createAsyncThunk("users/delete", async (id, { rejectWithValue }) => {
  try {
    await axiosInstance.delete(`/users/delete-user/${id}`);
    return { id };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete user");
  }
});
