import { createSlice } from "@reduxjs/toolkit";
import { fetchConversation, searchInLesson } from "./discussionGet";
import { startConversation, askQuestion, answerDelta, answerStage } from "./discussionPost";
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
  // What the question in flight is waiting on: null before the server has
  // said, then "searching", then "writing".
  askStage: null,
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

// The answer while it is being written: grown by answerDelta, replaced by the
// stored answer when the question is fulfilled, removed if it fails. It never
// carries citations — the server sends those with the stored answer, and the
// [n] markers in a draft are plain text until then.
const draftId = (requestId) => `draft-${requestId}`;

const withoutTemporary = (messages, requestId) =>
  messages.filter((m) => m.id !== pendingId(requestId) && m.id !== draftId(requestId));

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
        lesson.askStage = null;
        lesson.askError = null;
        lesson.messages.push({
          id: pendingId(action.meta.requestId),
          role: "user",
          content: question,
          citations: [],
          pending: true,
        });
      })
      .addCase(answerStage, (state, action) => {
        const { mediaId, requestId, stage } = action.payload;
        const lesson = lessonOf(state, mediaId);
        // Only for the question still waiting — not one already answered.
        if (lesson.messages.some((m) => m.id === pendingId(requestId))) lesson.askStage = stage;
      })
      .addCase(answerDelta, (state, action) => {
        const { mediaId, requestId, text } = action.payload;
        const lesson = lessonOf(state, mediaId);
        // A piece for a question no longer on screen — its lesson was reset
        // (signing out) — has nothing to attach to.
        if (!lesson.messages.some((m) => m.id === pendingId(requestId))) return;
        const draft = lesson.messages.find((m) => m.id === draftId(requestId));
        if (draft) draft.content += text;
        else lesson.messages.push({ id: draftId(requestId), role: "assistant", content: text, citations: [], streaming: true });
      })
      .addCase(askQuestion.fulfilled, (state, action) => {
        const lesson = lessonOf(state, action.meta.arg.mediaId);
        lesson.asking = false;
        lesson.askStage = null;
        lesson.conversation = action.payload.conversation;
        // The stored pair replaces both the pending question and the draft:
        // what stays on screen is what is in the database.
        lesson.messages = withoutTemporary(lesson.messages, action.meta.requestId)
          .concat(action.payload.messages);
      })
      .addCase(askQuestion.rejected, (state, action) => {
        // The server stores nothing for a failed answer, so the question — and
        // whatever of the answer had arrived — is taken back off the screen
        // too. The composer keeps the question for a retry.
        const lesson = lessonOf(state, action.meta.arg.mediaId);
        lesson.asking = false;
        lesson.askStage = null;
        lesson.askError = action.payload ?? null;
        lesson.messages = withoutTemporary(lesson.messages, action.meta.requestId);
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
