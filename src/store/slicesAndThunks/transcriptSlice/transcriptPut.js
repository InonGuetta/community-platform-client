import { createAsyncThunk } from "@reduxjs/toolkit";
import { transcriptsApi } from "../../../api/transcriptsApi";
import { rejectionOf } from "../../../utilities/apiError";

export const updateTranscript = createAsyncThunk("transcript/update", async ({ mediaId, ...payload }, { rejectWithValue }) => {
  try {
    return await transcriptsApi.update(mediaId, payload);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Update failed"));
  }
});

export const fixHebrewTranscript = createAsyncThunk("transcript/fixHebrew", async (mediaId, { rejectWithValue }) => {
  try {
    return await transcriptsApi.fixHebrew(mediaId);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Hebrew correction failed"));
  }
});

export const generateKeyPointHeadings = createAsyncThunk("transcript/keyPointHeadings", async (mediaId, { rejectWithValue }) => {
  try {
    return await transcriptsApi.keyPointHeadings(mediaId);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to generate headings"));
  }
});

export const triggerTranscriptPipeline = createAsyncThunk("transcript/trigger", async (mediaId, { rejectWithValue }) => {
  try {
    return await transcriptsApi.trigger(mediaId);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Pipeline trigger failed"));
  }
});
