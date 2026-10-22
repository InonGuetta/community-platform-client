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
