import { createApiThunk } from "../../createApiThunk";
import { usersApi } from "../../../api/usersApi";

export const createUser = createApiThunk("users/create", "Failed to create user", async (payload) => {
  return await usersApi.create(payload);
});

// ── Role approval ───────────────────────────────────────────────────────────
//
// Both answer with the UPDATED user row, which is what lets the slice replace it
// in place: the account moves out of the waiting list and into the table proper
// in one action, with no refetch and therefore no window in which it appears in
// both.

export const approveUser = createApiThunk("users/approve", "Failed to approve the request", async (id) => {
  return await usersApi.approve(id);
});

export const rejectUser = createApiThunk(
  "users/reject", "Failed to reject the request",
  async ({ id, reason }) => {
    return await usersApi.reject(id, reason);
  }
);
