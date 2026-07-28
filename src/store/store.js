import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slicesAndThunks/authSlices/authSlice";
import mediaReducer from "./slicesAndThunks/mediaSlice/mediaSlice";
import sessionsReducer from "./slicesAndThunks/sessionsSlice/sessionsSlice";
import transcriptReducer from "./slicesAndThunks/transcriptSlice/transcriptSlice";
import bookmarksReducer from "./slicesAndThunks/bookmarksSlice/bookmarksSlice";
import notesReducer from "./slicesAndThunks/notesSlice/notesSlice";
import usersReducer from "./slicesAndThunks/usersSlice/usersSlice";
import uiReducer from "./slicesAndThunks/uiSlice";
import notificationReducer from "./slicesAndThunks/notificationSlice";
import { notificationMiddleware } from "./middleware/notificationMiddleware";
import { setUnauthorizedHandler } from "../utilities/axiosInstance";
import { sessionExpired } from "./slicesAndThunks/authSlices/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    media: mediaReducer,
    sessions: sessionsReducer,
    transcript: transcriptReducer,
    bookmarks: bookmarksReducer,
    notes: notesReducer,
    users: usersReducer,
    ui: uiReducer,
    notification: notificationReducer,
  },
  // Keep the default middleware (thunk + dev checks) and append ours, which
  // turns mutation outcomes into toasts.
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(notificationMiddleware),
});

// Wire the API layer's 401 handling here, where the store already exists. This
// direction is the whole point: axiosInstance must not import the store, or the
// existing store -> slices -> axiosInstance chain becomes a cycle.
setUnauthorizedHandler(() => store.dispatch(sessionExpired()));
