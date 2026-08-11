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

export const register = createAsyncThunk("auth/register", async ({ email, password, displayName }, { rejectWithValue }) => {
  try {
    return await authApi.register({ email, password, displayName });
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Registration failed"));
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
