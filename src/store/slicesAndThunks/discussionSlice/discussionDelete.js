import { createAsyncThunk } from "@reduxjs/toolkit";
import { discussionApi } from "../../../api/discussionApi";
import { rejectionOf } from "../../../utilities/apiError";

// Deleting a conversation from the history of the "דיון עם בינה מלאכותית" tab.
export const deleteConversation = createAsyncThunk(
  "discussion/deleteConversation",
  async ({ mediaId, conversationId }, { rejectWithValue }) => {
    try {
      return await discussionApi.deleteConversation(mediaId, conversationId);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to delete the conversation"));
    }
  }
);
