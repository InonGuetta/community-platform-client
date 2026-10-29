import { createAsyncThunk } from "@reduxjs/toolkit";
import { discussionApi } from "../../../api/discussionApi";
import { rejectionOf } from "../../../utilities/apiError";

export const fetchConversation = createAsyncThunk(
  "discussion/fetchConversation",
  async (mediaId, { rejectWithValue }) => {
    try {
      return await discussionApi.getConversation(mediaId);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to load the conversation"));
    }
  }
);

// `query` rides in the thunk's arg, so the reducer can drop an answer that
// arrives after the user has already typed and run a newer search.
export const searchInLesson = createAsyncThunk(
  "discussion/search",
  async ({ mediaId, query }, { rejectWithValue }) => {
    try {
      return await discussionApi.search(mediaId, query);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Search failed"));
    }
  }
);

// The caller's earlier conversations on the lesson, for the history mode.
export const fetchHistory = createAsyncThunk(
  "discussion/fetchHistory",
  async (mediaId, { rejectWithValue }) => {
    try {
      return await discussionApi.listConversations(mediaId);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to load the history"));
    }
  }
);

// One earlier conversation, to read in the history.
export const openHistoryConversation = createAsyncThunk(
  "discussion/openHistoryConversation",
  async ({ mediaId, conversationId }, { rejectWithValue }) => {
    try {
      return await discussionApi.getConversationById(mediaId, conversationId);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to open the conversation"));
    }
  }
);
