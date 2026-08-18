import { createAsyncThunk } from "@reduxjs/toolkit";
import { sessionsApi } from "../../../api/sessionsApi";
import { rejectionOf } from "../../../utilities/apiError";

export const fetchActiveSessions = createAsyncThunk("sessions/fetchActive", async (_, { rejectWithValue }) => {
  try {
    return await sessionsApi.listActive();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch sessions"));
  }
});

export const fetchUpcomingSessions = createAsyncThunk("sessions/fetchUpcoming", async (_, { rejectWithValue }) => {
  try {
    return await sessionsApi.listUpcoming();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch upcoming sessions"));
  }
});

export const fetchSessionById = createAsyncThunk("sessions/fetchById", async (id, { rejectWithValue }) => {
  try {
    return await sessionsApi.getOne(id);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch session"));
  }
});
