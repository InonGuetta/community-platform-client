import { createAction, createAsyncThunk } from "@reduxjs/toolkit";
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

// A piece of the answer as it is written. Declared here rather than in the
// slice because the thunk below dispatches it, and the slice imports the
// thunk — defining it there would make the two files import each other.
// `requestId` ties the piece to the question it answers.
export const answerDelta = createAction("discussion/answerDelta");

export const askQuestion = createAsyncThunk(
  "discussion/ask",
  async ({ mediaId, question }, { dispatch, requestId, signal, rejectWithValue }) => {
    try {
      return await discussionApi.askStream(mediaId, question, {
        signal,
        onDelta: (text) => dispatch(answerDelta({ mediaId, requestId, text })),
      });
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to get an answer"));
    }
  }
);
