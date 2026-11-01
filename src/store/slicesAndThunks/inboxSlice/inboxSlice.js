import { createSlice } from "@reduxjs/toolkit";
import { fetchInbox } from "./inboxGet";
import { markNotificationRead, markAllNotificationsRead } from "./inboxPost";
import { statuses } from "../../../utilities/constant";

// The notification centre's state (PRD 6.15). Named "inbox" rather than
// "notifications" because the store already has `notification` — the toast
// queue — and two slices one letter apart is a bug waiting for an import.
//
// `pendingRoleRequests` is null for anybody but an admin: the server only sends
// it to them, and null rather than 0 lets the navbar tell "nobody waiting" from
// "not yours to know".
const inboxSlice = createSlice({
  name: "inbox",
  initialState: { items: [], unread: 0, pendingRoleRequests: null, status: statuses.idle },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInbox.pending, (state) => {
        // Only the first load shows as loading; a poll replaces the list in place
        // rather than blanking an open menu every minute.
        if (state.status === statuses.idle) state.status = statuses.loading;
      })
      .addCase(fetchInbox.fulfilled, (state, action) => {
        state.status = statuses.succeeded;
        state.items = action.payload.items ?? [];
        state.unread = action.payload.unread ?? 0;
        state.pendingRoleRequests = action.payload.pendingRoleRequests ?? null;
      })
      .addCase(fetchInbox.rejected, (state) => {
        // Keep what was there: a failed poll is not news that the inbox emptied.
        if (state.status === statuses.loading) state.status = statuses.failed;
      })

      // Optimistic, like a like: the dot goes on click and the request follows.
      // Marking read is idempotent on the server, and a failure is corrected by
      // the next poll.
      .addCase(markNotificationRead.pending, (state, action) => {
        const item = state.items.find((n) => n.id === action.meta.arg);
        if (item && !item.read_at) {
          item.read_at = new Date().toISOString();
          state.unread = Math.max(0, state.unread - 1);
        }
      })
      .addCase(markAllNotificationsRead.pending, (state) => {
        const now = new Date().toISOString();
        state.items.forEach((n) => { if (!n.read_at) n.read_at = now; });
        state.unread = 0;
      });
  },
});

export default inboxSlice.reducer;
