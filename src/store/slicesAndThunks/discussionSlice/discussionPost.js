import { createAction } from "@reduxjs/toolkit";
import { createApiThunk } from "../../createApiThunk";
import { discussionApi } from "../../../api/discussionApi";

export const startConversation = createApiThunk(
  "discussion/startConversation", "Failed to start a conversation",
  async (mediaId) => {
    return await discussionApi.startConversation(mediaId);
  }
);

// "המשך את השיחה הזו": an earlier conversation becomes the current one.
export const resumeConversation = createApiThunk(
  "discussion/resumeConversation", "Failed to resume the conversation",
  async ({ mediaId, conversationId }) => {
    return await discussionApi.resumeConversation(mediaId, conversationId);
  }
);

// A piece of the answer as it is written. Declared here rather than in the
// slice because the thunk below dispatches it, and the slice imports the
// thunk — defining it there would make the two files import each other.
// `requestId` ties the piece to the question it answers.
export const answerDelta = createAction("discussion/answerDelta");

// Which step the answer is at — "searching" (finding the passages, the slow
// part of a long lesson) or "writing". Declared here for the same reason.
export const answerStage = createAction("discussion/answerStage");

export const askQuestion = createApiThunk(
  "discussion/ask", "Failed to get an answer",
  async ({ mediaId, question }, { dispatch, requestId, signal }) => {
    return await discussionApi.askStream(mediaId, question, {
      signal,
      onStage: (stage) => dispatch(answerStage({ mediaId, requestId, stage })),
      onDelta: (text) => dispatch(answerDelta({ mediaId, requestId, text })),
    });
  }
);
