import { createSlice } from "@reduxjs/toolkit";
import { fetchConversation, searchInLesson } from "./discussionGet";
import { startConversation, askQuestion } from "./discussionPost";
import { statuses } from "../../../utilities/constant";

// The "דיון עם AI" tab, kept PER LESSON. Moving from one lesson to another and
// back must not show the first lesson's answers under the second's title, and
// a search still in flight for lesson A must not land in lesson B's list —
// both of which a single shared `messages` array would do.
//
// Signing out empties this slice with every other (store.js resets the root),
// so the next person on the same tab never sees these questions.

export const emptyLesson = () => ({
  conversation: null,
  messages: [],
  loadStatus: statuses.idle,
  loadError: null,
  asking: false,
  askError: null,
  search: { query: "", results: [], status: statuses.idle, error: null },
});

const lessonOf = (state, mediaId) => {
  if (!state.byMediaId[mediaId]) state.byMediaId[mediaId] = emptyLesson();
  return state.byMediaId[mediaId];
};

// The question shown at once, before the server answers. Marked so it can be
// found and replaced by the stored pair, or taken back if the answer fails.
const pendingId = (requestId) => `pending-${requestId}`;

const discussionSlice = createSlice({
  name: "discussion",
  initialState: { byMediaId: {} },
  reducers: {
    clearSearch(state, action) {
      lessonOf(state, action.payload).search = emptyLesson().search;
    },
    clearAskError(state, action) {
      lessonOf(state, action.payload).askError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchConversation.pending, (state, action) => {
        const lesson = lessonOf(state, action.meta.arg);
        lesson.loadStatus = statuses.loading;
        lesson.loadError = null;
      })
      .addCase(fetchConversation.fulfilled, (state, action) => {
        const lesson = lessonOf(state, action.meta.arg);
        lesson.loadStatus = statuses.succeeded;
        lesson.conversation = action.payload.conversation;
        lesson.messages = action.payload.messages;
      })
      .addCase(fetchConversation.rejected, (state, action) => {
        const lesson = lessonOf(state, action.meta.arg);
        lesson.loadStatus = statuses.failed;
        lesson.loadError = action.payload ?? null;
      })

      .addCase(startConversation.fulfilled, (state, action) => {
        const lesson = lessonOf(state, action.meta.arg);
        lesson.conversation = action.payload.conversation;
        lesson.messages = action.payload.messages;
        lesson.askError = null;
        lesson.loadStatus = statuses.succeeded;
      })

      .addCase(askQuestion.pending, (state, action) => {
        const { mediaId, question } = action.meta.arg;
        const lesson = lessonOf(state, mediaId);
        lesson.asking = true;
        lesson.askError = null;
        lesson.messages.push({
          id: pendingId(action.meta.requestId),
          role: "user",
          content: question,
          citations: [],
          pending: true,
        });
      })
      .addCase(askQuestion.fulfilled, (state, action) => {
        const lesson = lessonOf(state, action.meta.arg.mediaId);
        lesson.asking = false;
        lesson.conversation = action.payload.conversation;
        lesson.messages = lesson.messages
          .filter((m) => m.id !== pendingId(action.meta.requestId))
          .concat(action.payload.messages);
      })
      .addCase(askQuestion.rejected, (state, action) => {
        // The server stores nothing for a failed answer, so the question is
        // taken back off the screen too — the composer keeps it for a retry.
        const lesson = lessonOf(state, action.meta.arg.mediaId);
        lesson.asking = false;
        lesson.askError = action.payload ?? null;
        lesson.messages = lesson.messages.filter((m) => m.id !== pendingId(action.meta.requestId));
      })

      .addCase(searchInLesson.pending, (state, action) => {
        const { mediaId, query } = action.meta.arg;
        const lesson = lessonOf(state, mediaId);
        lesson.search = { ...lesson.search, query, status: statuses.loading, error: null };
      })
      .addCase(searchInLesson.fulfilled, (state, action) => {
        const { mediaId, query } = action.meta.arg;
        const lesson = lessonOf(state, mediaId);
        // A slower, older search finishing last must not replace the newer one.
        if (lesson.search.query !== query) return;
        lesson.search = { query, results: action.payload, status: statuses.succeeded, error: null };
      })
      .addCase(searchInLesson.rejected, (state, action) => {
        const { mediaId, query } = action.meta.arg;
        const lesson = lessonOf(state, mediaId);
        if (lesson.search.query !== query) return;
        lesson.search = { ...lesson.search, results: [], status: statuses.failed, error: action.payload ?? null };
      });
  },
});

export const { clearSearch, clearAskError } = discussionSlice.actions;
export default discussionSlice.reducer;
