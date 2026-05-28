import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const fetchTranscript = createAsyncThunk("transcript/fetch", async (mediaId, { rejectWithValue }) => {
  console.log(`[FE:transcript] GET /transcripts/${mediaId} →`);
  try {
    const { data } = await axiosInstance.get(`/transcripts/${mediaId}`);
    console.log(`[FE:transcript] GET /transcripts/${mediaId} ✓ status=${data?.status} chunks=${data?.chunks?.length ?? 0}`);
    return data;
  } catch (err) {
    const httpStatus = err.response?.status;
    console.log(`[FE:transcript] GET /transcripts/${mediaId} ✗ http=${httpStatus} msg="${err.response?.data?.message || err.message}"`);
    return rejectWithValue(err.response?.data?.message || "Failed to fetch transcript");
  }
});

export const searchTranscripts = createAsyncThunk("transcript/search", async (query, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get("/transcripts/search", { params: { q: query } });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Search failed");
  }
});
