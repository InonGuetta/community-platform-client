import { createApiThunk } from "../../createApiThunk";
import { discussionApi } from "../../../api/discussionApi";

// Deleting a conversation from the history of the "דיון עם בינה מלאכותית" tab.
export const deleteConversation = createApiThunk(
  "discussion/deleteConversation", "Failed to delete the conversation",
  async ({ mediaId, conversationId }) => {
    return await discussionApi.deleteConversation(mediaId, conversationId);
  }
);
