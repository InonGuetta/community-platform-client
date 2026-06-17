import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const fetchTranscript = createAsyncThunk("transcript/fetch", async (mediaId, { rejectWithValue }) => {
  console.log(`[FE:thunk] fetchTranscript → GET /transcripts/${mediaId}`);
  try {
    const { data } = await axiosInstance.get(`/transcripts/${mediaId}`);
    console.log(`[FE:thunk] fetchTranscript ✓ status=${data?.status} chunks=${data?.chunks?.length ?? 0}`);
    return data;
  } catch (err) {
    console.log(`[FE:thunk] fetchTranscript ✗ http=${err.response?.status} msg="${err.response?.data?.message || err.message}"`);
    return rejectWithValue(err.response?.data?.message || "Failed to fetch transcript");
  }
});

// mode: "hybrid" (default) | "semantic" | "keyword". The "smart deep search"
// box passes "hybrid" — meaning + keyword fused on the server.
export const searchTranscripts = createAsyncThunk("transcript/search", async ({ q, mode = "hybrid" }, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get("/transcripts/search", { params: { q, mode } });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Search failed");
  }
});
