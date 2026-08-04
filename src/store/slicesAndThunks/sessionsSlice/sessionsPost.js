import { createAsyncThunk } from "@reduxjs/toolkit";
import { sessionsApi } from "../../../api/sessionsApi";

export const createSession = createAsyncThunk("sessions/create", async (payload, { rejectWithValue }) => {
  try {
    return await sessionsApi.create(payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to create session");
  }
});
