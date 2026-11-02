import { createAsyncThunk } from "@reduxjs/toolkit";
import { mediaApi } from "../../../api/mediaApi";
import {
  claimOffline,
  isQuotaError,
  keepStorage,
  offlineSupported,
  percentOf,
  reconcileOffline,
  storeOffline,
} from "../../../utilities/offlineStore";
import { notify } from "../notificationSlice";
import { offlineProgress } from "./offlineSlice";

// Lessons kept for listening with no network (PRD MOB-2). The storage itself is
// utilities/offlineStore.js; these thunks put it in the store so the download
// menu, the downloads page and the navbar all see the same list and the same
// progress.

// The list as it is on this device, minus lessons the browser has evicted.
export const loadOfflineLessons = createAsyncThunk("offline/load", async () => reconcileOffline());

// Called when a user is known: the lessons on the device become theirs, or are
// deleted when another user saved them.
export const claimOfflineLessons = createAsyncThunk("offline/claim", async (userId) => {
  await claimOffline(userId);
  return reconcileOffline();
});

// In flight, by lesson id. Outside the store because an AbortController is not
// serialisable — and the cancel button lives on a different page from the menu
// that started the download, so it cannot hold the thunk's own promise.
const inFlight = new Map();

export const cancelOfflineSave = (id) => inFlight.get(id)?.abort();

// Progress is reported per network chunk — about 1,600 times for a 100 MB
// lecture. Only a change worth redrawing reaches the store: a new whole percent,
// or, when the size is unknown, another megabyte.
const MB = 1024 * 1024;
const worthReporting = (last, received, total) => {
  const percent = percentOf(received, total);
  if (percent !== null) return percent !== percentOf(last, total);
  return Math.floor(received / MB) !== Math.floor(last / MB);
};

const failureMessage = (err) => {
  if (isQuotaError(err)) return "אין מספיק מקום במכשיר. מחקו שיעורים שהורדתם ונסו שוב.";
  if (err?.status === 429) return "השרת עסוק כרגע בהכנת קבצי שמע אחרים. נסו שוב בעוד כמה דקות.";
  if (err?.status === 403 || err?.status === 404) return "השיעור הזה לא זמין להורדה.";
  return "ההורדה להאזנה נכשלה. בדקו את החיבור ונסו שוב.";
};

// Downloads one lesson and keeps it. A cancelled download ends quietly — the
// user pressed the button that did it.
export const saveForOffline = createAsyncThunk(
  "offline/save",
  async (media, { dispatch, rejectWithValue }) => {
    if (!offlineSupported()) {
      dispatch(notify({ message: "הדפדפן הזה לא מאפשר לשמור שיעורים להאזנה בלי רשת.", severity: "warning" }));
      return rejectWithValue({ code: "UNSUPPORTED" });
    }
    const controller = new AbortController();
    inFlight.set(media.id, controller);
    let last = 0;
    try {
      // Asked on the first save: a saved lesson is worth keeping when the disk
      // fills, and the browser decides whether to ask the user.
      keepStorage();
      const blob = await mediaApi.fetchForListening(media, {
        signal: controller.signal,
        onProgress: (received, total) => {
          if (!worthReporting(last, received, total)) return;
          last = received;
          dispatch(offlineProgress({ id: media.id, received, total }));
        },
      });
      const items = await storeOffline(media, blob);
      dispatch(notify({ message: "השיעור נשמר להאזנה בלי רשת", severity: "success" }));
      return items;
    } catch (err) {
      if (err?.name === "AbortError") return rejectWithValue({ code: "ABORTED" });
      dispatch(notify({ message: failureMessage(err), severity: "error" }));
      return rejectWithValue({ code: isQuotaError(err) ? "STORAGE_FULL" : "FAILED", status: err?.status ?? null });
    } finally {
      inFlight.delete(media.id);
    }
  },
  // One download per lesson: a second press while it runs does nothing.
  { condition: (media, { getState }) => !getState().offline.progress[media.id] }
);
