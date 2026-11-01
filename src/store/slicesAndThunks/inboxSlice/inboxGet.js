import { createAsyncThunk } from "@reduxjs/toolkit";
import { notificationsApi } from "../../../api/notificationsApi";
import { rejectionOf } from "../../../utilities/apiError";

// Polled by the navbar. Silent on failure — it is not in the toast middleware's
// list, deliberately: a dropped connection would otherwise say so once a minute
// about a bell nobody asked to look at.
export const fetchInbox = createAsyncThunk("inbox/fetch", async (_, { rejectWithValue }) => {
  try {
    return await notificationsApi.list();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch notifications"));
  }
});
