import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const fetchTranscript = createAsyncThunk("transcript/fetch", async (mediaId, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get(`/transcripts/${mediaId}`);
    return data;
  } catch (err) {
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
