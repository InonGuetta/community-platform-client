import { createAsyncThunk } from "@reduxjs/toolkit";
import { createApiThunk } from "../../createApiThunk";
import { authApi } from "../../../api/authApi";
import { rejectionOf } from "../../../utilities/apiError";

export const login = createApiThunk("auth/login", "Login failed", async ({ email, password }) => {
  return await authApi.login({ email, password });
});

export const register = createApiThunk("auth/register", "Registration failed", async ({ email, password, displayName, requestedRole }) => {
  return await authApi.register({ email, password, displayName, requestedRole });
});

// Deliberately NOT reported through the slice's error state. The server answers
// identically whether or not the address has an account, so the page must say
// the same thing either way — anything else would rebuild, in the UI, exactly
// the enumeration oracle the endpoint refuses to be.
export const requestPasswordReset = createApiThunk("auth/forgotPassword", "Could not send the reset link", async (email) => {
  return await authApi.forgotPassword(email);
});

// Answers with the user and a fresh cookie, so it lands in the slice exactly
// like a login — which is what it is.
export const resetPassword = createApiThunk("auth/resetPassword", "Password reset failed", async ({ token, password }) => {
  return await authApi.resetPassword({ token, password });
});

export const verifyEmail = createApiThunk("auth/verifyEmail", "Email verification failed", async (token) => {
  return await authApi.verifyEmail(token);
});

export const changePassword = createApiThunk("auth/changePassword", "Password change failed", async (payload) => {
  return await authApi.changePassword(payload);
});

export const logout = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await authApi.logout();
    return true;
  } catch (err) {
    // Even if the server call fails (e.g. expired cookie) we still want to clear client state.
    return rejectWithValue(rejectionOf(err, "Logout failed"));
  }
});

// Asking for a role after registration.
//
// Answers with the caller's own updated row, so the slice can replace the stored
// user and the pending banner appears without a refetch of /auth/me.
export const requestRole = createApiThunk(
  "auth/requestRole", "Failed to submit the request",
  async (requestedRole) => {
    return await authApi.requestRole(requestedRole);
  }
);

