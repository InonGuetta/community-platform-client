import { createAsyncThunk } from "@reduxjs/toolkit";
import { usersApi } from "../../../api/usersApi";
import { rejectionOf } from "../../../utilities/apiError";

export const updateUser = createAsyncThunk("users/update", async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    return await usersApi.update(id, payload);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to update user"));
  }
});
