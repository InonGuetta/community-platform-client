import { createSlice } from "@reduxjs/toolkit";
import { login, register } from "./authPost";
import { fetchMe } from "./authGet";
import { statuses } from "../../../utilities/constant";

const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, token: null, status: statuses.idle, error: null },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = statuses.idle;
      state.error = null;
      localStorage.removeItem("token");
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.status = statuses.loading; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.status = statuses.succeeded;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; })

      .addCase(register.pending, (state) => { state.status = statuses.loading; state.error = null; })
      .addCase(register.fulfilled, (state, action) => {
        state.status = statuses.succeeded;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; })

      .addCase(fetchMe.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchMe.fulfilled, (state, action) => { state.status = statuses.succeeded; state.user = action.payload; })
      .addCase(fetchMe.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
