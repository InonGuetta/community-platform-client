import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const updateTranscript = createAsyncThunk("transcript/update", async ({ mediaId, ...payload }, { rejectWithValue }) => {
  console.log(`[FE:transcript] PUT /transcripts/${mediaId} →`);
  try {
    const { data } = await axiosInstance.put(`/transcripts/${mediaId}`, payload);
    console.log(`[FE:transcript] PUT /transcripts/${mediaId} ✓`);
    return data;
  } catch (err) {
    console.log(`[FE:transcript] PUT /transcripts/${mediaId} ✗`, err.response?.status, err.response?.data);
    return rejectWithValue(err.response?.data?.message || "Update failed");
  }
});

export const triggerTranscriptPipeline = createAsyncThunk("transcript/trigger", async (mediaId, { rejectWithValue }) => {
  console.log(`[FE:transcript] POST /transcripts/${mediaId}/trigger →`);
  try {
    const { data } = await axiosInstance.post(`/transcripts/${mediaId}/trigger`);
    console.log(`[FE:transcript] POST /transcripts/${mediaId}/trigger ✓`, data);
    return data;
  } catch (err) {
    console.log(`[FE:transcript] POST /transcripts/${mediaId}/trigger ✗`, err.response?.status, err.response?.data);
    return rejectWithValue(err.response?.data?.message || "Pipeline trigger failed");
  }
});
