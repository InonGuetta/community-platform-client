// The bell's inbox (PRD NOTIF-4). The defaults are for a store without the
// slice — the tests' — and EMPTY is one array, so an empty inbox is the same
// value on every render rather than a new one each time.
const EMPTY = [];

export const selectInboxItems = (state) => state.inbox?.items ?? EMPTY;
export const selectInboxUnread = (state) => state.inbox?.unread ?? 0;
// null for anybody but an admin: the server sends the count to admins alone.
export const selectPendingRoleRequests = (state) => state.inbox?.pendingRoleRequests ?? null;
