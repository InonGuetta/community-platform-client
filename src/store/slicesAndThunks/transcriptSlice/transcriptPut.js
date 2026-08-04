import { createAsyncThunk } from "@reduxjs/toolkit";
import { transcriptsApi } from "../../../api/transcriptsApi";

export const updateTranscript = createAsyncThunk("transcript/update", async ({ mediaId, ...payload }, { rejectWithValue }) => {
  try {
    return await transcriptsApi.update(mediaId, payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Update failed");
  }
});

export const fixHebrewTranscript = createAsyncThunk("transcript/fixHebrew", async (mediaId, { rejectWithValue }) => {
  try {
    return await transcriptsApi.fixHebrew(mediaId);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Hebrew correction failed");
  }
});

export const generateKeyPointHeadings = createAsyncThunk("transcript/keyPointHeadings", async (mediaId, { rejectWithValue }) => {
  try {
    return await transcriptsApi.keyPointHeadings(mediaId);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to generate headings");
  }
});

export const triggerTranscriptPipeline = createAsyncThunk("transcript/trigger", async (mediaId, { rejectWithValue }) => {
  try {
    return await transcriptsApi.trigger(mediaId);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Pipeline trigger failed");
  }
});
