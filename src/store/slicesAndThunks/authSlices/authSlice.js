import { createSlice } from "@reduxjs/toolkit";
import { login, register, logout } from "./authPost";
import { fetchMe } from "./authGet";
import { statuses } from "../../../utilities/constant";

const initialState = {
  user: null,
  status: statuses.idle,
  loginStatus: statuses.idle,
  error: null,
  initialized: false,
  // Tracks the in-flight fetchMe request id; cleared whenever a login/register/logout
  // happens so a stale fetchMe response can't overwrite the freshly-set user.
  activeFetchMeRequestId: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authInitialized(state) {
      state.initialized = true;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loginStatus = statuses.loading;
        state.error = null;
        state.activeFetchMeRequestId = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loginStatus = statuses.succeeded;
        state.status = statuses.succeeded;
        state.user = action.payload.user;
        state.initialized = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loginStatus = statuses.failed;
        state.error = action.payload;
      })

      .addCase(register.pending, (state) => {
        state.loginStatus = statuses.loading;
        state.error = null;
        state.activeFetchMeRequestId = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loginStatus = statuses.succeeded;
        state.status = statuses.succeeded;
        state.user = action.payload.user;
        state.initialized = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loginStatus = statuses.failed;
        state.error = action.payload;
      })

      .addCase(fetchMe.pending, (state, action) => {
        state.status = statuses.loading;
        state.activeFetchMeRequestId = action.meta.requestId;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        if (state.activeFetchMeRequestId !== action.meta.requestId) return;
        state.status = statuses.succeeded;
        state.user = action.payload;
        state.initialized = true;
        state.activeFetchMeRequestId = null;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        // Only apply the rejection if no login/register/logout has invalidated us.
        if (state.activeFetchMeRequestId !== action.meta.requestId) {
          state.initialized = true;
          return;
        }
        state.status = statuses.failed;
        state.user = null;
        state.initialized = true;
        state.activeFetchMeRequestId = null;
      })

      .addCase(logout.pending, (state) => {
        state.activeFetchMeRequestId = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = statuses.idle;
        state.loginStatus = statuses.idle;
        state.error = null;
        state.initialized = true;
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.status = statuses.idle;
        state.loginStatus = statuses.idle;
        state.initialized = true;
      });
  },
});

export const { authInitialized, clearError } = authSlice.actions;
export default authSlice.reducer;
