import { createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "../../../api/authApi";
import { rejectionOf } from "../../../utilities/apiError";

export const login = createAsyncThunk("auth/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    return await authApi.login({ email, password });
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Login failed"));
  }
});

export const register = createAsyncThunk("auth/register", async ({ email, password, displayName, requestedRole }, { rejectWithValue }) => {
  try {
    return await authApi.register({ email, password, displayName, requestedRole });
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Registration failed"));
  }
});

// Deliberately NOT reported through the slice's error state. The server answers
// identically whether or not the address has an account, so the page must say
// the same thing either way — anything else would rebuild, in the UI, exactly
// the enumeration oracle the endpoint refuses to be.
export const requestPasswordReset = createAsyncThunk("auth/forgotPassword", async (email, { rejectWithValue }) => {
  try {
    return await authApi.forgotPassword(email);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Could not send the reset link"));
  }
});

// Answers with the user and a fresh cookie, so it lands in the slice exactly
// like a login — which is what it is.
export const resetPassword = createAsyncThunk("auth/resetPassword", async ({ token, password }, { rejectWithValue }) => {
  try {
    return await authApi.resetPassword({ token, password });
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Password reset failed"));
  }
});

export const verifyEmail = createAsyncThunk("auth/verifyEmail", async (token, { rejectWithValue }) => {
  try {
    return await authApi.verifyEmail(token);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Email verification failed"));
  }
});

export const changePassword = createAsyncThunk("auth/changePassword", async (payload, { rejectWithValue }) => {
  try {
    return await authApi.changePassword(payload);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Password change failed"));
  }
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
export const requestRole = createAsyncThunk(
  "auth/requestRole",
  async (requestedRole, { rejectWithValue }) => {
    try {
      return await authApi.requestRole(requestedRole);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to submit the request"));
    }
  }
);

