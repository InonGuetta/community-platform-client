import { createAsyncThunk } from "@reduxjs/toolkit";
import { usersApi } from "../../../api/usersApi";
import { rejectionOf } from "../../../utilities/apiError";

export const createUser = createAsyncThunk("users/create", async (payload, { rejectWithValue }) => {
  try {
    return await usersApi.create(payload);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to create user"));
  }
});

// ── Role approval ───────────────────────────────────────────────────────────
//
// Both answer with the UPDATED user row, which is what lets the slice replace it
// in place: the account moves out of the waiting list and into the table proper
// in one action, with no refetch and therefore no window in which it appears in
// both.

export const approveUser = createAsyncThunk("users/approve", async (id, { rejectWithValue }) => {
  try {
    return await usersApi.approve(id);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to approve the request"));
  }
});

export const rejectUser = createAsyncThunk(
  "users/reject",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      return await usersApi.reject(id, reason);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to reject the request"));
    }
  }
);
