import { describe, test, expect } from "vitest";
import reducer, { clearSearch, clearAskError } from "./discussionSlice";
import { fetchConversation, searchInLesson } from "./discussionGet";
import { startConversation, askQuestion } from "./discussionPost";

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
