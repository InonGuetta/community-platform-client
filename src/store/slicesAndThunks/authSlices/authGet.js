import { createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "../../../api/authApi";
import { rejectionOf } from "../../../utilities/apiError";

export const fetchMe = createAsyncThunk("auth/fetchMe", async (_, { rejectWithValue }) => {
  try {
    return await authApi.me();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch user"));
  }
});
