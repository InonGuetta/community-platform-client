import { createAsyncThunk } from "@reduxjs/toolkit";
import { clearOffline, removeOffline } from "../../../utilities/offlineStore";

// Removing lessons kept for listening with no network (PRD MOB-2). Local only —
// nothing on the server knows what a device has saved.

export const removeOfflineLesson = createAsyncThunk("offline/remove", async (id) => removeOffline(id));

export const clearOfflineLessons = createAsyncThunk("offline/clear", async () => clearOffline());
