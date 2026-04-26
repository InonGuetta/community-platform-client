import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const createSession = createAsyncThunk("sessions/create", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post("/sessions/create", payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to create session");
  }
});
