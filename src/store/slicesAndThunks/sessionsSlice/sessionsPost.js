import { createAsyncThunk } from "@reduxjs/toolkit";
import { sessionsApi } from "../../../api/sessionsApi";
import { rejectionOf } from "../../../utilities/apiError";

export const createSession = createAsyncThunk("sessions/create", async (payload, { rejectWithValue }) => {
  try {
    return await sessionsApi.create(payload);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to create session"));
  }
});
