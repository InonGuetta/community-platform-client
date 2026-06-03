import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const updateTranscript = createAsyncThunk("transcript/update", async ({ mediaId, ...payload }, { rejectWithValue }) => {
  console.log(`[FE:thunk] updateTranscript → PUT /transcripts/${mediaId}`);
  try {
    const { data } = await axiosInstance.put(`/transcripts/${mediaId}`, payload);
    console.log(`[FE:thunk] updateTranscript ✓`);
    return data;
  } catch (err) {
    console.log(`[FE:thunk] updateTranscript ✗ http=${err.response?.status} msg="${err.response?.data?.message || err.message}"`);
    return rejectWithValue(err.response?.data?.message || "Update failed");
  }
});

export const fixHebrewTranscript = createAsyncThunk("transcript/fixHebrew", async (mediaId, { rejectWithValue }) => {
  console.log(`[FE:thunk] fixHebrewTranscript → POST /transcripts/${mediaId}/fix-hebrew`);
  try {
    const { data } = await axiosInstance.post(`/transcripts/${mediaId}/fix-hebrew`);
    console.log(`[FE:thunk] fixHebrewTranscript ✓`);
    return data;
  } catch (err) {
    console.log(`[FE:thunk] fixHebrewTranscript ✗ http=${err.response?.status} msg="${err.response?.data?.message || err.message}"`);
    return rejectWithValue(err.response?.data?.message || "Hebrew correction failed");
  }
});

export const generateKeyPointHeadings = createAsyncThunk("transcript/keyPointHeadings", async (mediaId, { rejectWithValue }) => {
  console.log(`[FE:thunk] generateKeyPointHeadings → POST /transcripts/${mediaId}/key-point-headings`);
  try {
    const { data } = await axiosInstance.post(`/transcripts/${mediaId}/key-point-headings`);
    console.log(`[FE:thunk] generateKeyPointHeadings ✓`);
    return data;
  } catch (err) {
    console.log(`[FE:thunk] generateKeyPointHeadings ✗ http=${err.response?.status} msg="${err.response?.data?.message || err.message}"`);
    return rejectWithValue(err.response?.data?.message || "Failed to generate headings");
  }
});

export const triggerTranscriptPipeline = createAsyncThunk("transcript/trigger", async (mediaId, { rejectWithValue }) => {
  console.log(`[FE:thunk] triggerTranscriptPipeline → POST /transcripts/${mediaId}/trigger`);
  try {
    const { data } = await axiosInstance.post(`/transcripts/${mediaId}/trigger`);
    console.log(`[FE:thunk] triggerTranscriptPipeline ✓ jobId=${data?.jobId}`);
    return data;
  } catch (err) {
    console.log(`[FE:thunk] triggerTranscriptPipeline ✗ http=${err.response?.status} msg="${err.response?.data?.message || err.message}"`);
    return rejectWithValue(err.response?.data?.message || "Pipeline trigger failed");
  }
});
