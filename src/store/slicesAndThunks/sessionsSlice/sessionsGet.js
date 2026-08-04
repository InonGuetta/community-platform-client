import { createAsyncThunk } from "@reduxjs/toolkit";
import { sessionsApi } from "../../../api/sessionsApi";

export const fetchActiveSessions = createAsyncThunk("sessions/fetchActive", async (_, { rejectWithValue }) => {
  try {
    return await sessionsApi.listActive();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch sessions");
  }
});

export const fetchSessionById = createAsyncThunk("sessions/fetchById", async (id, { rejectWithValue }) => {
  try {
    return await sessionsApi.getOne(id);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch session");
  }
});
