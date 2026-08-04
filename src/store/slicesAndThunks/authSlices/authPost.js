import { createAsyncThunk } from "@reduxjs/toolkit";
import { authApi } from "../../../api/authApi";

export const login = createAsyncThunk("auth/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    return await authApi.login({ email, password });
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Login failed");
  }
});

export const register = createAsyncThunk("auth/register", async ({ email, password, displayName }, { rejectWithValue }) => {
  try {
    return await authApi.register({ email, password, displayName });
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Registration failed");
  }
});

export const logout = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await authApi.logout();
    return true;
  } catch (err) {
    // Even if the server call fails (e.g. expired cookie) we still want to clear client state.
    return rejectWithValue(err.response?.data?.message || "Logout failed");
  }
});
