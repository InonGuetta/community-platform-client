import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slicesAndThunks/authSlices/authSlice";
import mediaReducer from "./slicesAndThunks/mediaSlice/mediaSlice";
import sessionsReducer from "./slicesAndThunks/sessionsSlice/sessionsSlice";
import transcriptReducer from "./slicesAndThunks/transcriptSlice/transcriptSlice";
import bookmarksReducer from "./slicesAndThunks/bookmarksSlice/bookmarksSlice";
import usersReducer from "./slicesAndThunks/usersSlice/usersSlice";
import uiReducer from "./slicesAndThunks/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    media: mediaReducer,
    sessions: sessionsReducer,
    transcript: transcriptReducer,
    bookmarks: bookmarksReducer,
    users: usersReducer,
    ui: uiReducer,
  },
});
