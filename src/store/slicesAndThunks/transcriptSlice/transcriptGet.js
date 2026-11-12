import { createAsyncThunk } from "@reduxjs/toolkit";
import { createApiThunk } from "../../createApiThunk";
import { transcriptsApi } from "../../../api/transcriptsApi";
import { rejectionOf } from "../../../utilities/apiError";

// Takes an id — the full transcript — or { mediaId, content: false } for the
// chunks without their text (a book's page; see useMediaInsights).
export const fetchTranscript = createAsyncThunk("transcript/fetch", async (arg, { rejectWithValue }) => {
  const { mediaId, content = true } = typeof arg === "object" && arg !== null ? arg : { mediaId: arg };
  try {
    return await transcriptsApi.get(mediaId, { content });
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch transcript"));
  }
});

// mode: "hybrid" (default) | "semantic" | "keyword". The "smart deep search"
// box passes "hybrid" — meaning + keyword fused on the server.
export const searchTranscripts = createApiThunk("transcript/search", "Search failed", async ({ q, mode = "hybrid" }) => {
  return await transcriptsApi.search({ q, mode });
});
