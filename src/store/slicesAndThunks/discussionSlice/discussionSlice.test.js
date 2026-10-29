import { describe, test, expect } from "vitest";
import reducer, { clearSearch, clearAskError, closeHistoryConversation } from "./discussionSlice";
import { fetchConversation, searchInLesson, fetchHistory, openHistoryConversation } from "./discussionGet";
import { startConversation, askQuestion, answerDelta, answerStage, resumeConversation } from "./discussionPost";
import { deleteConversation } from "./discussionDelete";

// The "דיון עם AI" state, per lesson. Driven through the reducer with the
// thunks' own action creators, so the action shapes are the real ones.

const initial = () => reducer(undefined, { type: "@@init" });

const ask = (mediaId, question, requestId = "r1") => ({ arg: { mediaId, question }, requestId });

describe("asking a question", () => {
  test("the question shows at once, marked pending", () => {
    const { arg, requestId } = ask(7, "מה העיקר?");
    const state = reducer(initial(), askQuestion.pending(requestId, arg));
    const lesson = state.byMediaId[7];
    expect(lesson.asking).toBe(true);
    expect(lesson.messages).toEqual([
      expect.objectContaining({ role: "user", content: "מה העיקר?", pending: true }),
    ]);
  });

  test("the answer replaces the pending question with the stored pair", () => {
    const { arg, requestId } = ask(7, "מה העיקר?");
    let state = reducer(initial(), askQuestion.pending(requestId, arg));
    const payload = {
      conversation: { id: 17 },
      messages: [
        { id: 1, role: "user", content: "מה העיקר?", citations: [] },
        { id: 2, role: "assistant", content: "תשובה [1]", citations: [{ n: 1, start_time: 60 }] },
      ],
    };
    state = reducer(state, askQuestion.fulfilled(payload, requestId, arg));
    const lesson = state.byMediaId[7];
    expect(lesson.asking).toBe(false);
    expect(lesson.conversation).toEqual({ id: 17 });
    expect(lesson.messages.map((m) => m.id)).toEqual([1, 2]);
  });

  test("a failed answer takes the question back and keeps the reason", () => {
    const { arg, requestId } = ask(7, "מה העיקר?");
    let state = reducer(initial(), askQuestion.pending(requestId, arg));
    state = reducer(state, askQuestion.rejected(null, requestId, arg, { code: "AI_ANSWER_FAILED" }));
    const lesson = state.byMediaId[7];
    expect(lesson.messages).toEqual([], "the server stored nothing, so the thread shows nothing");
    expect(lesson.askError).toEqual({ code: "AI_ANSWER_FAILED" });
    expect(lesson.asking).toBe(false);

    state = reducer(state, clearAskError(7));
    expect(state.byMediaId[7].askError).toBe(null);
  });

  test("questions in two lessons never meet", () => {
    let state = reducer(initial(), askQuestion.pending("a", ask(7, "שאלה בשיעור 7").arg));
    state = reducer(state, askQuestion.pending("b", ask(8, "שאלה בשיעור 8").arg));
    expect(state.byMediaId[7].messages.map((m) => m.content)).toEqual(["שאלה בשיעור 7"]);
    expect(state.byMediaId[8].messages.map((m) => m.content)).toEqual(["שאלה בשיעור 8"]);
  });
});

describe("loading and starting conversations", () => {
  test("the stored conversation is loaded into its lesson", () => {
    let state = reducer(initial(), fetchConversation.pending("r", 7));
    expect(state.byMediaId[7].loadStatus).toBe("loading");
    state = reducer(state, fetchConversation.fulfilled(
      { conversation: { id: 17 }, messages: [{ id: 1, role: "user", content: "x" }] }, "r", 7
    ));
    expect(state.byMediaId[7].loadStatus).toBe("succeeded");
    expect(state.byMediaId[7].messages).toHaveLength(1);
  });

  test("a lesson never discussed loads as an empty, loaded thread", () => {
    const state = reducer(initial(), fetchConversation.fulfilled({ conversation: null, messages: [] }, "r", 7));
    expect(state.byMediaId[7]).toMatchObject({ conversation: null, messages: [], loadStatus: "succeeded" });
  });

  test("'שיחה חדשה' clears the thread on screen", () => {
    let state = reducer(initial(), fetchConversation.fulfilled(
      { conversation: { id: 17 }, messages: [{ id: 1 }, { id: 2 }] }, "r", 7
    ));
    state = reducer(state, startConversation.fulfilled({ conversation: { id: 18 }, messages: [] }, "s", 7));
    expect(state.byMediaId[7].conversation).toEqual({ id: 18 });
    expect(state.byMediaId[7].messages).toEqual([]);
  });
});

describe("smart search", () => {
  const search = (query) => ({ mediaId: 7, query });

  test("results land in their lesson", () => {
    let state = reducer(initial(), searchInLesson.pending("r", search("תשובה")));
    expect(state.byMediaId[7].search.status).toBe("loading");
    state = reducer(state, searchInLesson.fulfilled([{ id: 1 }], "r", search("תשובה")));
    expect(state.byMediaId[7].search).toMatchObject({ query: "תשובה", results: [{ id: 1 }], status: "succeeded" });
  });

  test("an older search finishing last does not replace the newer one", () => {
    let state = reducer(initial(), searchInLesson.pending("old", search("תש")));
    state = reducer(state, searchInLesson.pending("new", search("תשובה")));
    state = reducer(state, searchInLesson.fulfilled([{ id: 2 }], "new", search("תשובה")));
    state = reducer(state, searchInLesson.fulfilled([{ id: 1 }], "old", search("תש")));
    expect(state.byMediaId[7].search.results).toEqual([{ id: 2 }]);
    expect(state.byMediaId[7].search.query).toBe("תשובה");
  });

  test("a failure empties the results and keeps the reason", () => {
    let state = reducer(initial(), searchInLesson.pending("r", search("x")));
    state = reducer(state, searchInLesson.rejected(null, "r", search("x"), { code: "INTERNAL_ERROR" }));
    expect(state.byMediaId[7].search).toMatchObject({ results: [], status: "failed", error: { code: "INTERNAL_ERROR" } });
  });

  test("clearing resets only the search, not the conversation", () => {
    let state = reducer(initial(), fetchConversation.fulfilled({ conversation: { id: 17 }, messages: [{ id: 1 }] }, "r", 7));
    state = reducer(state, searchInLesson.fulfilled([{ id: 1 }], "s", search("x")));
    state = reducer(state, clearSearch(7));
    expect(state.byMediaId[7].search.results).toEqual([]);
    expect(state.byMediaId[7].messages).toHaveLength(1);
  });
});

describe("an answer as it is written", () => {
  const begin = () => reducer(initial(), askQuestion.pending("r1", { mediaId: 7, question: "מה העיקר?" }));

  test("pieces grow one draft answer under the question", () => {
    let state = begin();
    state = reducer(state, answerDelta({ mediaId: 7, requestId: "r1", text: "העיקר " }));
    state = reducer(state, answerDelta({ mediaId: 7, requestId: "r1", text: "הוא תשובה [1]." }));
    const [, draft] = state.byMediaId[7].messages;
    expect(draft).toMatchObject({ role: "assistant", content: "העיקר הוא תשובה [1].", streaming: true, citations: [] });
    expect(state.byMediaId[7].messages).toHaveLength(2);
  });

  test("the stored answer replaces the draft, so the screen shows what is saved", () => {
    let state = begin();
    state = reducer(state, answerDelta({ mediaId: 7, requestId: "r1", text: "טיוטה" }));
    state = reducer(state, askQuestion.fulfilled(
      { conversation: { id: 17 }, messages: [{ id: 1, role: "user" }, { id: 2, role: "assistant", content: "סופי [1]" }] },
      "r1", { mediaId: 7, question: "מה העיקר?" }
    ));
    expect(state.byMediaId[7].messages.map((m) => m.id)).toEqual([1, 2]);
  });

  test("a failed answer takes away whatever of it had arrived", () => {
    let state = begin();
    state = reducer(state, answerDelta({ mediaId: 7, requestId: "r1", text: "חצי" }));
    state = reducer(state, askQuestion.rejected(null, "r1", { mediaId: 7, question: "מה העיקר?" }, { code: "AI_ANSWER_FAILED" }));
    expect(state.byMediaId[7].messages).toEqual([]);
  });

  test("a piece for a question no longer on screen is dropped", () => {
    const state = reducer(initial(), answerDelta({ mediaId: 7, requestId: "gone", text: "x" }));
    expect(state.byMediaId[7].messages).toEqual([]);
  });
});

describe("which step the answer is at", () => {
  const arg = { mediaId: 7, question: "מה העיקר?" };

  test("a question starts with no step, and follows the server's", () => {
    let state = reducer(initial(), askQuestion.pending("r1", arg));
    expect(state.byMediaId[7].askStage).toBe(null);
    state = reducer(state, answerStage({ mediaId: 7, requestId: "r1", stage: "searching" }));
    expect(state.byMediaId[7].askStage).toBe("searching");
    state = reducer(state, answerStage({ mediaId: 7, requestId: "r1", stage: "writing" }));
    expect(state.byMediaId[7].askStage).toBe("writing");
  });

  test("the step is cleared when the answer arrives, and when it fails", () => {
    let state = reducer(initial(), askQuestion.pending("r1", arg));
    state = reducer(state, answerStage({ mediaId: 7, requestId: "r1", stage: "writing" }));
    const done = reducer(state, askQuestion.fulfilled({ conversation: { id: 1 }, messages: [] }, "r1", arg));
    expect(done.byMediaId[7].askStage).toBe(null);
    const failed = reducer(state, askQuestion.rejected(null, "r1", arg, { code: "AI_ANSWER_FAILED" }));
    expect(failed.byMediaId[7].askStage).toBe(null);
  });

  test("a step for a question already answered is ignored", () => {
    const state = reducer(initial(), answerStage({ mediaId: 7, requestId: "old", stage: "writing" }));
    expect(state.byMediaId[7].askStage).toBe(null);
  });
});

describe("the history", () => {
  test("is loaded into its lesson", () => {
    let state = reducer(initial(), fetchHistory.pending("r", 7));
    expect(state.byMediaId[7].history.status).toBe("loading");
    state = reducer(state, fetchHistory.fulfilled([{ id: 3 }], "r", 7));
    expect(state.byMediaId[7].history).toMatchObject({ items: [{ id: 3 }], status: "succeeded" });
  });

  // So it is fetched again next time — never shown stale.
  test("goes stale when a question is answered, or a conversation started", () => {
    const loaded = reducer(initial(), fetchHistory.fulfilled([{ id: 3 }], "r", 7));
    const asked = reducer(
      reducer(loaded, askQuestion.pending("q", { mediaId: 7, question: "x" })),
      askQuestion.fulfilled({ conversation: { id: 3 }, messages: [] }, "q", { mediaId: 7, question: "x" })
    );
    expect(asked.byMediaId[7].history.status).toBe("idle");
    const started = reducer(loaded, startConversation.fulfilled({ conversation: { id: 4 }, messages: [] }, "s", 7));
    expect(started.byMediaId[7].history.status).toBe("idle");
  });

  test("opening a conversation shows it; a quick second click wins", () => {
    let state = reducer(initial(), openHistoryConversation.pending("a", { mediaId: 7, conversationId: 3 }));
    state = reducer(state, openHistoryConversation.pending("b", { mediaId: 7, conversationId: 4 }));
    state = reducer(state, openHistoryConversation.fulfilled({ conversation: { id: 3 }, messages: [{ id: 1 }] }, "a", { mediaId: 7, conversationId: 3 }));
    expect(state.byMediaId[7].viewing.conversationId).toBe(4);
    expect(state.byMediaId[7].viewing.status).toBe("loading");
  });

  test("resuming makes it the current conversation and closes the view", () => {
    let state = reducer(initial(), openHistoryConversation.fulfilled({ conversation: { id: 3 }, messages: [] }, "a", { mediaId: 7, conversationId: 3 }));
    state = reducer(state, resumeConversation.fulfilled({ conversation: { id: 3 }, messages: [{ id: 1 }, { id: 2 }] }, "r", { mediaId: 7, conversationId: 3 }));
    const lesson = state.byMediaId[7];
    expect(lesson.conversation).toEqual({ id: 3 });
    expect(lesson.messages).toHaveLength(2);
    expect(lesson.viewing.conversationId).toBe(null);
    expect(lesson.history.status).toBe("idle");
  });

  test("closing the view returns to the list", () => {
    let state = reducer(initial(), openHistoryConversation.pending("a", { mediaId: 7, conversationId: 3 }));
    state = reducer(state, closeHistoryConversation(7));
    expect(state.byMediaId[7].viewing.conversationId).toBe(null);
  });
});

test("a failed resume keeps the conversation open, with the reason", () => {
  const arg = { mediaId: 7, conversationId: 3 };
  let state = reducer(initial(), openHistoryConversation.pending("a", arg));
  state = reducer(state, openHistoryConversation.fulfilled({ conversation: { id: 3 }, messages: [{ id: 1 }] }, "a", arg));
  state = reducer(state, resumeConversation.pending("r", arg));
  state = reducer(state, resumeConversation.rejected(null, "r", arg, { code: "DB_UNAVAILABLE" }));
  expect(state.byMediaId[7].viewing.conversationId).toBe(3);
  expect(state.byMediaId[7].viewing.resumeError).toEqual({ code: "DB_UNAVAILABLE" });
  state = reducer(state, resumeConversation.pending("r2", arg));
  expect(state.byMediaId[7].viewing.resumeError).toBe(null);
});

describe("deleting a conversation from the history", () => {
  const arg = { mediaId: 7, conversationId: 3 };
  const withHistory = () => {
    const state = reducer(initial(), fetchConversation.fulfilled({ conversation: { id: 9 }, messages: [{ id: 1 }] }, "f", 7));
    return reducer(state, fetchHistory.fulfilled([{ id: 9 }, { id: 3 }], "h", 7));
  };

  test("the row goes once the server has deleted it, not before", () => {
    let state = reducer(withHistory(), deleteConversation.pending("d", arg));
    expect(state.byMediaId[7].deletingId).toBe(3);
    expect(state.byMediaId[7].history.items.map((c) => c.id)).toEqual([9, 3]);
    state = reducer(state, deleteConversation.fulfilled({ deleted: true, id: 3 }, "d", arg));
    expect(state.byMediaId[7].deletingId).toBe(null);
    expect(state.byMediaId[7].history.items.map((c) => c.id)).toEqual([9]);
    // Another conversation deleted: the chat on screen is untouched.
    expect(state.byMediaId[7].conversation).toEqual({ id: 9 });
  });

  test("deleting the current conversation sends the chat back to the server for the next", () => {
    const current = { mediaId: 7, conversationId: 9 };
    const state = reducer(withHistory(), deleteConversation.fulfilled({ deleted: true, id: 9 }, "d", current));
    const lesson = state.byMediaId[7];
    expect(lesson.conversation).toBe(null);
    expect(lesson.messages).toEqual([]);
    expect(lesson.loadStatus).toBe("idle");
  });

  test("a failed deletion keeps the row, with the reason", () => {
    let state = reducer(withHistory(), deleteConversation.pending("d", arg));
    state = reducer(state, deleteConversation.rejected(null, "d", arg, { code: "NOT_FOUND" }));
    expect(state.byMediaId[7].history.items).toHaveLength(2);
    expect(state.byMediaId[7].deleteError).toEqual({ code: "NOT_FOUND" });
    expect(reducer(state, deleteConversation.pending("d2", arg)).byMediaId[7].deleteError).toBe(null);
  });
});

describe("today's question quota", () => {
  const loadWith = (quota) => reducer(initial(), fetchConversation.fulfilled({ conversation: null, messages: [], quota }, "f", 7));

  test("comes with the conversation, and is the reader's - not the lesson's", () => {
    const state = loadWith({ limit: 50, remaining: 42 });
    expect(state.quota).toEqual({ limit: 50, remaining: 42 });
    expect(state.byMediaId[7].quota).toBeUndefined();
  });

  test("an answered question is one used, and never below none", () => {
    const { arg, requestId } = ask(7, "ש");
    let state = reducer(loadWith({ limit: 50, remaining: 1 }), askQuestion.pending(requestId, arg));
    state = reducer(state, askQuestion.fulfilled({ conversation: { id: 1 }, messages: [] }, requestId, arg));
    expect(state.quota.remaining).toBe(0);
    state = reducer(state, askQuestion.fulfilled({ conversation: { id: 1 }, messages: [] }, "r2", arg));
    expect(state.quota.remaining).toBe(0);
  });

  test("the server's 429 is the last word, whatever was counted here", () => {
    const { arg, requestId } = ask(7, "ש");
    let state = reducer(loadWith({ limit: 50, remaining: 30 }), askQuestion.pending(requestId, arg));
    state = reducer(state, askQuestion.rejected(null, requestId, arg, { code: "AI_DAILY_LIMIT" }));
    expect(state.quota.remaining).toBe(0);
  });

  test("a failed answer uses nothing; and a role the quota does not bind has none", () => {
    const { arg, requestId } = ask(7, "ש");
    let state = reducer(loadWith({ limit: 50, remaining: 30 }), askQuestion.pending(requestId, arg));
    state = reducer(state, askQuestion.rejected(null, requestId, arg, { code: "AI_ANSWER_FAILED" }));
    expect(state.quota.remaining).toBe(30);
    expect(loadWith(null).quota).toBe(null);
  });
});
