import { createSlice } from "@reduxjs/toolkit";
import { fetchActiveSessions, fetchSessionById } from "./sessionsGet";
import { createSession } from "./sessionsPost";
import { statuses } from "../../../utilities/constant";

const sessionsSlice = createSlice({
  name: "sessions",
  initialState: { rooms: [], activeRoom: null, status: statuses.idle, error: null },
  reducers: {
    setActiveRoom(state, action) { state.activeRoom = action.payload; },
    clearActiveRoom(state) { state.activeRoom = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveSessions.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchActiveSessions.fulfilled, (state, action) => { state.status = statuses.succeeded; state.rooms = action.payload; })
      .addCase(fetchActiveSessions.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; })

      .addCase(fetchSessionById.fulfilled, (state, action) => { state.activeRoom = action.payload; })

      .addCase(createSession.pending, (state) => { state.status = statuses.loading; })
      .addCase(createSession.fulfilled, (state, action) => { state.status = statuses.succeeded; state.rooms.unshift(action.payload); state.activeRoom = action.payload; })
      .addCase(createSession.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; });
  },
});

export const { setActiveRoom, clearActiveRoom } = sessionsSlice.actions;
export default sessionsSlice.reducer;
