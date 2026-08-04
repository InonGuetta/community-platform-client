import { createAsyncThunk } from "@reduxjs/toolkit";
import { usersApi } from "../../../api/usersApi";

export const deleteUser = createAsyncThunk("users/delete", async (id, { rejectWithValue }) => {
  try {
    await usersApi.remove(id);
    return { id };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to delete user");
  }
});
