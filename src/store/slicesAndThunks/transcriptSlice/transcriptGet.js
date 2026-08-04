import { createAsyncThunk } from "@reduxjs/toolkit";
import { transcriptsApi } from "../../../api/transcriptsApi";

export const fetchTranscript = createAsyncThunk("transcript/fetch", async (mediaId, { rejectWithValue }) => {
  try {
    return await transcriptsApi.get(mediaId);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch transcript");
  }
});

// mode: "hybrid" (default) | "semantic" | "keyword". The "smart deep search"
// box passes "hybrid" — meaning + keyword fused on the server.
export const searchTranscripts = createAsyncThunk("transcript/search", async ({ q, mode = "hybrid" }, { rejectWithValue }) => {
  try {
    return await transcriptsApi.search({ q, mode });
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Search failed");
  }
});
