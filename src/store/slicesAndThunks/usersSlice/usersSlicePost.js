import { createAsyncThunk } from "@reduxjs/toolkit";
import { usersApi } from "../../../api/usersApi";

export const createUser = createAsyncThunk("users/create", async (payload, { rejectWithValue }) => {
  try {
    return await usersApi.create(payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to create user");
  }
});
