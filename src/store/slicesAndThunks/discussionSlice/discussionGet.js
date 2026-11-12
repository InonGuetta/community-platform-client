import { createApiThunk } from "../../createApiThunk";
import { discussionApi } from "../../../api/discussionApi";

export const fetchConversation = createApiThunk(
  "discussion/fetchConversation", "Failed to load the conversation",
  async (mediaId) => {
    return await discussionApi.getConversation(mediaId);
  }
);

// `query` rides in the thunk's arg, so the reducer can drop an answer that
// arrives after the user has already typed and run a newer search.
export const searchInLesson = createApiThunk(
  "discussion/search", "Search failed",
  async ({ mediaId, query }) => {
    return await discussionApi.search(mediaId, query);
  }
);

// The caller's earlier conversations on the lesson, for the history mode.
export const fetchHistory = createApiThunk(
  "discussion/fetchHistory", "Failed to load the history",
  async (mediaId) => {
    return await discussionApi.listConversations(mediaId);
  }
);

// One earlier conversation, to read in the history.
export const openHistoryConversation = createApiThunk(
  "discussion/openHistoryConversation", "Failed to open the conversation",
  async ({ mediaId, conversationId }) => {
    return await discussionApi.getConversationById(mediaId, conversationId);
  }
);
