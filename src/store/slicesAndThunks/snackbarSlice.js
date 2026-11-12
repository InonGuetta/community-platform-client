import { createSlice } from "@reduxjs/toolkit";

// A single, app-wide "current toast". `key` changes on every notify so the
// Snackbar remounts and its auto-hide timer restarts even when a new message
// arrives while the previous one is still showing (the classic MUI
// consecutive-snackbars pattern — no external queue library needed).
//
// The file is named for the snackbar so it is not mistaken for the bell's
// notifications, which are inboxSlice. Its state key (`notification`) and its
// action types ("notification/notify") keep the old name: the store, the
// middleware, GlobalSnackbar's selector and every test's store know it by it.
const snackbarSlice = createSlice({
  name: "notification",
  initialState: { open: false, message: "", severity: "info", key: 0 },
  reducers: {
    notify(state, action) {
      const { message, severity = "info" } = action.payload;
      state.open = true;
      state.message = message;
      state.severity = severity;
      state.key = Date.now();
    },
    closeNotification(state) {
      state.open = false;
    },
  },
});

export const { notify, closeNotification } = snackbarSlice.actions;
export default snackbarSlice.reducer;
