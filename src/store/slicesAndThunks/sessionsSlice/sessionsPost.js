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

// Asking the server for a room token. Deliberately NOT stored in the slice: it
// is a credential with a lifetime of one room, and Redux state is inspectable,
// serialised into devtools and kept for the life of the tab. The room page holds
// it in component state and drops it on unmount.
export const joinSession = createAsyncThunk("sessions/join", async (id, { rejectWithValue }) => {
  try {
    return await sessionsApi.join(id);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Could not join the session"));
  }
});

export const startSession = createAsyncThunk("sessions/start", async (id, { rejectWithValue }) => {
  try {
    return await sessionsApi.start(id);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Could not start the session"));
  }
});
