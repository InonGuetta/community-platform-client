import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const fetchActiveSessions = createAsyncThunk("sessions/fetchActive", async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get("/sessions/active");
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch sessions");
  }
});

export const fetchSessionById = createAsyncThunk("sessions/fetchById", async (id, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get(`/sessions/${id}`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch session");
  }
});
