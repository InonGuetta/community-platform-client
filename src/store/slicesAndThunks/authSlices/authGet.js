import { createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "../../../api/authApi";

export const fetchMe = createAsyncThunk("auth/fetchMe", async (_, { rejectWithValue }) => {
  try {
    return await authApi.me();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch user");
  }
});
