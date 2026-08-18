import { createSlice } from "@reduxjs/toolkit";
import { fetchActiveSessions, fetchUpcomingSessions, fetchSessionById } from "./sessionsGet";
import { createSession, startSession } from "./sessionsPost";
import { statuses } from "../../../utilities/constant";

// `rooms` is what is running now; `upcoming` is what has been scheduled and not
// yet opened. Two arrays rather than one filtered by state, because they are
// fetched from two endpoints and ordered oppositely — merging them would mean
// re-sorting on every render to undo the order each arrived in.
//
// The room TOKEN is deliberately absent from all of it. It never reaches the
// client except from the join call, which the room page holds in component state
// — see joinSession.
const sessionsSlice = createSlice({
  name: "sessions",
  initialState: { rooms: [], upcoming: [], activeRoom: null, status: statuses.idle, error: null },
  reducers: {
    setActiveRoom(state, action) { state.activeRoom = action.payload; },
    clearActiveRoom(state) { state.activeRoom = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveSessions.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchActiveSessions.fulfilled, (state, action) => { state.status = statuses.succeeded; state.rooms = action.payload; })
      .addCase(fetchActiveSessions.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload?.message; })

      .addCase(fetchUpcomingSessions.fulfilled, (state, action) => { state.upcoming = action.payload; })

      .addCase(fetchSessionById.fulfilled, (state, action) => { state.activeRoom = action.payload; })

      // Opening a scheduled room moves it between the two lists. Done here
      // rather than by refetching both, so the card the host just clicked does
      // not disappear and reappear.
      .addCase(startSession.fulfilled, (state, action) => {
        state.upcoming = state.upcoming.filter((r) => r.id !== action.payload.id);
        state.rooms.unshift(action.payload);
        state.activeRoom = action.payload;
      })

      .addCase(createSession.pending, (state) => { state.status = statuses.loading; })
      // A session created with a time lands in `upcoming`; one created without
      // is already live. The server decides which by whether it set started_at,
      // and reports it as `state` so the client does not have to infer it.
      .addCase(createSession.fulfilled, (state, action) => {
        state.status = statuses.succeeded;
        if (action.payload.state === "scheduled") state.upcoming.unshift(action.payload);
        else state.rooms.unshift(action.payload);
        state.activeRoom = action.payload;
      })
      .addCase(createSession.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload?.message; });
  },
});

export const { setActiveRoom, clearActiveRoom } = sessionsSlice.actions;
export default sessionsSlice.reducer;
