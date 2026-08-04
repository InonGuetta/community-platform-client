import { createAsyncThunk } from "@reduxjs/toolkit";
import { usersApi } from "../../../api/usersApi";

export const updateUser = createAsyncThunk("users/update", async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    return await usersApi.update(id, payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to update user");
  }
});
