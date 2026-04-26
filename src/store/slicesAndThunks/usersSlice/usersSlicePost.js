import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const createUser = createAsyncThunk("users/create", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post("/users/create-user", payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to create user");
  }
});
