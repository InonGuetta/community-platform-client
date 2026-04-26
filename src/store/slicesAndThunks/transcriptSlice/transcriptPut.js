import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const updateTranscript = createAsyncThunk("transcript/update", async ({ mediaId, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.put(`/transcripts/${mediaId}`, payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Update failed");
  }
});

export const triggerTranscriptPipeline = createAsyncThunk("transcript/trigger", async (mediaId, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post(`/transcripts/${mediaId}/trigger`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Pipeline trigger failed");
  }
});
