import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const login = createAsyncThunk("auth/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post("/auth/login", { email, password });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Login failed");
  }
});

export const register = createAsyncThunk("auth/register", async ({ email, password, displayName }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post("/auth/register", { email, password, displayName });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Registration failed");
  }
});

export const logout = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await axiosInstance.post("/auth/logout");
    return true;
  } catch (err) {
    // Even if the server call fails (e.g. expired cookie) we still want to clear client state.
    return rejectWithValue(err.response?.data?.message || "Logout failed");
  }
});
