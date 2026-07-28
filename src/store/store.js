import { configureStore, combineReducers } from "@reduxjs/toolkit";
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

const appReducer = combineReducers({
  auth: authReducer,
  media: mediaReducer,
  sessions: sessionsReducer,
  transcript: transcriptReducer,
  bookmarks: bookmarksReducer,
  notes: notesReducer,
  users: usersReducer,
  ui: uiReducer,
  notification: notificationReducer,
});

// Signing out has to empty every slice, not just auth. Only the auth state was
// being cleared, so the next person to sign in on the same tab saw the previous
// user's notes and bookmarks until each page's own fetch replaced them. The
// per-slice clearNotes/clearBookmarks reducers existed for this and were never
// dispatched from anywhere.
//
// Handled at the root rather than by adding a case to each slice: this covers
// slices added later too, which is precisely the thing nobody remembers to wire
// up. Passing undefined makes every reducer return its own initial state.
const RESET_ON = new Set([
  "auth/logout/fulfilled",
  // Logout still clears locally when the server call fails — an expired cookie
  // makes that request fail, and staying "signed in" would be worse.
  "auth/logout/rejected",
  "auth/sessionExpired",
]);

const rootReducer = (state, action) => appReducer(RESET_ON.has(action.type) ? undefined : state, action);

export const store = configureStore({
  reducer: rootReducer,
  // Keep the default middleware (thunk + dev checks) and append ours, which
  // turns mutation outcomes into toasts.
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(notificationMiddleware),
});

// Wire the API layer's 401 handling here, where the store already exists. This
// direction is the whole point: axiosInstance must not import the store, or the
// existing store -> slices -> axiosInstance chain becomes a cycle.
setUnauthorizedHandler(() => store.dispatch(sessionExpired()));
