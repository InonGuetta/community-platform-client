import { createAsyncThunk } from "@reduxjs/toolkit";
import { usersApi } from "../../../api/usersApi";
import { rejectionOf } from "../../../utilities/apiError";

export const createUser = createAsyncThunk("users/create", async (payload, { rejectWithValue }) => {
  try {
    return await usersApi.create(payload);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to create user"));
  }
});
