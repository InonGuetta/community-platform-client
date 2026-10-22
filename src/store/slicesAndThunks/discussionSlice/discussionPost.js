import { createAsyncThunk } from "@reduxjs/toolkit";
import { discussionApi } from "../../../api/discussionApi";
import { rejectionOf } from "../../../utilities/apiError";

export const startConversation = createAsyncThunk(
  "discussion/startConversation",
  async (mediaId, { rejectWithValue }) => {
    try {
      return await discussionApi.startConversation(mediaId);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to start a conversation"));
    }
  }
);

export const askQuestion = createAsyncThunk(
  "discussion/ask",
  async ({ mediaId, question }, { rejectWithValue }) => {
    try {
      return await discussionApi.ask(mediaId, question);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to get an answer"));
    }
  }
);
