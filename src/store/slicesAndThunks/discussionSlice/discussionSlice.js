import { createSlice } from "@reduxjs/toolkit";
import { fetchConversation, searchInLesson, fetchHistory, openHistoryConversation } from "./discussionGet";
import { startConversation, askQuestion, answerDelta, answerStage, resumeConversation } from "./discussionPost";
import { deleteConversation } from "./discussionDelete";
import { statuses } from "../../../utilities/constant";
import { ERROR_CODES } from "../../../utilities/apiError";

// The "דיון עם AI" tab, kept PER LESSON. Moving from one lesson to another and
// back must not show the first lesson's answers under the second's title, and
// a search still in flight for lesson A must not land in lesson B's list —
// both of which a single shared `messages` array would do.
//
// Signing out empties this slice with every other (store.js resets the root),
// so the next person on the same tab never sees these questions.
//
// `quota` is the one thing NOT per lesson: today's question quota is counted
// across every lesson, so it is the reader's, not the lesson's. null until a
// conversation has been loaded, and stays null for a role it does not bind.

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
  // The history mode: the list of earlier conversations, and the one open in it.
  // `history.status` goes back to idle whenever the list may have changed — a
  // question answered, a conversation started or resumed — so it is fetched
  // again the next time the history is shown, never served stale.
  history: { items: [], status: statuses.idle, error: null },
  // `resumeError` — "המשך את השיחה הזו" failed; the conversation stays open,
  // and the reader is told, rather than a click that seems to do nothing.
  viewing: { conversationId: null, conversation: null, messages: [], status: statuses.idle, error: null, resumeError: null },
  // The id of the conversation whose deletion is in flight, and a deletion
  // that failed — said in the history, where it was asked for.
  deletingId: null,
  deleteError: null,
});

const closedView = () => emptyLesson().viewing;

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
  initialState: { byMediaId: {}, quota: null },
  reducers: {
    clearSearch(state, action) {
      lessonOf(state, action.payload).search = emptyLesson().search;
    },
    clearAskError(state, action) {
      lessonOf(state, action.payload).askError = null;
    },
    closeHistoryConversation(state, action) {
      lessonOf(state, action.payload).viewing = closedView();
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
        // Fresh from the server on every load — which is also what puts a new
        // day's full quota back after midnight.
        if (action.payload.quota !== undefined) state.quota = action.payload.quota;
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
        lesson.history.status = statuses.idle;
      })

      .addCase(fetchHistory.pending, (state, action) => {
        const lesson = lessonOf(state, action.meta.arg);
        lesson.history.status = statuses.loading;
        lesson.history.error = null;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        lessonOf(state, action.meta.arg).history = { items: action.payload, status: statuses.succeeded, error: null };
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        const lesson = lessonOf(state, action.meta.arg);
        lesson.history.status = statuses.failed;
        lesson.history.error = action.payload ?? null;
      })

      .addCase(openHistoryConversation.pending, (state, action) => {
        const { mediaId, conversationId } = action.meta.arg;
        lessonOf(state, mediaId).viewing = { ...closedView(), conversationId, status: statuses.loading };
      })
      .addCase(openHistoryConversation.fulfilled, (state, action) => {
        const { mediaId, conversationId } = action.meta.arg;
        const lesson = lessonOf(state, mediaId);
        // Only if it is still the one being opened — a quick second click wins.
        if (lesson.viewing.conversationId !== conversationId) return;
        lesson.viewing = { conversationId, ...action.payload, status: statuses.succeeded, error: null };
      })
      .addCase(openHistoryConversation.rejected, (state, action) => {
        const { mediaId, conversationId } = action.meta.arg;
        const lesson = lessonOf(state, mediaId);
        if (lesson.viewing.conversationId !== conversationId) return;
        lesson.viewing = { ...lesson.viewing, status: statuses.failed, error: action.payload ?? null };
      })

      .addCase(resumeConversation.pending, (state, action) => {
        lessonOf(state, action.meta.arg.mediaId).viewing.resumeError = null;
      })
      .addCase(resumeConversation.rejected, (state, action) => {
        lessonOf(state, action.meta.arg.mediaId).viewing.resumeError = action.payload ?? { code: null };
      })
      .addCase(resumeConversation.fulfilled, (state, action) => {
        const lesson = lessonOf(state, action.meta.arg.mediaId);
        lesson.conversation = action.payload.conversation;
        lesson.messages = action.payload.messages;
        lesson.askError = null;
        lesson.loadStatus = statuses.succeeded;
        lesson.viewing = closedView();
        lesson.history.status = statuses.idle;
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
        lesson.history.status = statuses.idle;
        // One question answered is one question used — counted here rather
        // than asked for again, the same arithmetic the server does.
        if (state.quota) state.quota.remaining = Math.max(0, state.quota.remaining - 1);
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
        // The server's word that today's quota is spent, whatever the count here
        // said — another tab may have used the rest.
        if (state.quota && action.payload?.code === ERROR_CODES.AI_DAILY_LIMIT) state.quota.remaining = 0;
      })

      .addCase(deleteConversation.pending, (state, action) => {
        const lesson = lessonOf(state, action.meta.arg.mediaId);
        lesson.deletingId = action.meta.arg.conversationId;
        lesson.deleteError = null;
      })
      .addCase(deleteConversation.rejected, (state, action) => {
        const lesson = lessonOf(state, action.meta.arg.mediaId);
        lesson.deletingId = null;
        lesson.deleteError = action.payload ?? { code: null };
      })
      .addCase(deleteConversation.fulfilled, (state, action) => {
        const { mediaId, conversationId } = action.meta.arg;
        const lesson = lessonOf(state, mediaId);
        lesson.deletingId = null;
        lesson.history.items = lesson.history.items.filter((c) => c.id !== conversationId);
        if (lesson.viewing.conversationId === conversationId) lesson.viewing = closedView();
        // The current conversation deleted: the chat is now whichever the
        // server finds latest — the one before it, or none — so it is loaded
        // again rather than guessed at here.
        if (lesson.conversation?.id === conversationId) {
          lesson.conversation = null;
          lesson.messages = [];
          lesson.loadStatus = statuses.idle;
        }
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

export const { clearSearch, clearAskError, closeHistoryConversation } = discussionSlice.actions;
export default discussionSlice.reducer;
