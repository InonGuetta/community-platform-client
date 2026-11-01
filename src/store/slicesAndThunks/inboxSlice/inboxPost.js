import { createAsyncThunk } from "@reduxjs/toolkit";
import { notificationsApi } from "../../../api/notificationsApi";
import { rejectionOf } from "../../../utilities/apiError";

export const markNotificationRead = createAsyncThunk("inbox/markRead", async (id, { rejectWithValue }) => {
  try {
    await notificationsApi.markRead(id);
    return id;
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to mark the notification read"));
  }
});

export const markAllNotificationsRead = createAsyncThunk("inbox/markAllRead", async (_, { rejectWithValue }) => {
  try {
    await notificationsApi.markAllRead();
    return true;
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to mark notifications read"));
  }
});
