import { test, expect, describe, beforeEach } from "vitest";
import { store } from "./store";
import { selectBookmarksByMediaId } from "./selectors/bookmarksSelectors";
import { selectTranscriptByMediaId } from "./selectors/transcriptSelectors";

const auth = () => store.getState().auth;
const transcript = (id) => store.getState().transcript.byMediaId[id];

const signIn = () =>
  store.dispatch({ type: "auth/login/fulfilled", payload: { user: { id: 1, role: "admin" } } });

describe("an expired session", () => {
  beforeEach(signIn);

  test("clears everything the sign-in form and the router depend on", () => {
    store.dispatch({ type: "auth/sessionExpired" });

    expect(auth().user).toBe(null);
    // ProtectedRoute redirects on (initialized && !user), so this has to stay
    // true or the app renders nothing instead of the sign-in page.
    expect(auth().initialized).toBe(true);
    expect(auth().error).toBe(null);
    expect(auth().loginStatus).toBe("idle");
    expect(auth().activeFetchMeRequestId).toBe(null);
  });

  test("a fetchMe already in flight cannot put the user back", () => {
    store.dispatch({ type: "auth/fetchMe/pending", meta: { requestId: "req-9" } });
    store.dispatch({ type: "auth/sessionExpired" });
    store.dispatch({ type: "auth/fetchMe/fulfilled", payload: { id: 1 }, meta: { requestId: "req-9" } });

    expect(auth().user).toBe(null);
  });
});

// Only auth was being cleared on sign-out, so the next person to sign in on the
// same tab saw the previous user's notes and bookmarks until each page's own
// fetch replaced them.
describe("signing out empties every slice", () => {
  const loadUserData = () => {
    store.dispatch({ type: "bookmarks/fetch/fulfilled", payload: [{ id: 1, media_id: 7, timestamp_seconds: 10 }] });
    store.dispatch({ type: "notes/fetch/fulfilled", payload: [{ id: 1, title: "פרטי" }] });
    store.dispatch({ type: "media/fetchAll/fulfilled", payload: [{ id: 1, title: "שיעור" }] });
    store.dispatch({ type: "transcript/fetch/fulfilled", payload: { media_id: 7, status: "done" } });
    store.dispatch({ type: "users/fetchAll/fulfilled", payload: [{ id: 1, email: "a@b.c" }] });
  };

  test.each(["auth/logout/fulfilled", "auth/logout/rejected", "auth/sessionExpired"])(
    "%s leaves nothing behind",
    (type) => {
      signIn();
      loadUserData();
      expect(store.getState().notes.items).toHaveLength(1);

      store.dispatch({ type });

      const state = store.getState();
      expect(state.auth.user).toBe(null);
      expect(state.notes.items).toEqual([]);
      expect(state.bookmarks.items).toEqual([]);
      expect(state.media.items).toEqual([]);
      expect(state.transcript.byMediaId).toEqual({});
      expect(state.users.items).toEqual([]);
    }
  );

  test("ordinary actions do not reset anything", () => {
    signIn();
    loadUserData();
    store.dispatch({ type: "ui/openUpload" });
    expect(store.getState().notes.items).toHaveLength(1);
    expect(store.getState().auth.user).not.toBe(null);
  });
});

// RETURNING * has no chunks, and the chapter list and the editor's fallback
// text are built from them. Assigning the response over the stored entry
// discarded them on every save.
describe("transcript updates merge rather than replace", () => {
  beforeEach(() => {
    store.dispatch({
      type: "transcript/fetch/fulfilled",
      payload: {
        media_id: 7, status: "done", edited_text: "old", ai_summary: "S",
        chunks: [{ id: 1, content: "c1" }, { id: 2, content: "c2" }],
      },
    });
  });

  test.each([
    ["saving an edit", "transcript/update/fulfilled", { media_id: 7, edited_text: "NEW" }],
    ["fixing Hebrew", "transcript/fixHebrew/fulfilled", { media_id: 7, edited_text: "FIXED" }],
    ["generating headings", "transcript/keyPointHeadings/fulfilled", { media_id: 7, ai_key_point_headings: [] }],
  ])("%s keeps the chunks", (_label, type, payload) => {
    store.dispatch({ type, payload });
    expect(transcript(7).chunks).toHaveLength(2);
  });

  test("the update itself is applied", () => {
    store.dispatch({ type: "transcript/update/fulfilled", payload: { media_id: 7, edited_text: "NEW" } });
    expect(transcript(7).edited_text).toBe("NEW");
  });

  test("a field the server explicitly cleared is not resurrected", () => {
    store.dispatch({ type: "transcript/update/fulfilled", payload: { media_id: 7, ai_summary: null } });
    expect(transcript(7).ai_summary).toBe(null);
    expect(transcript(7).chunks).toHaveLength(2);
  });

  test("merging into an unknown media id does not throw", () => {
    store.dispatch({ type: "transcript/update/fulfilled", payload: { media_id: 99, edited_text: "x" } });
    expect(transcript(99).edited_text).toBe("x");
  });
});

// These are factories. Calling them inline rebuilt the selector every render,
// so memoisation never applied — and the bookmarks one ends in .filter(), which
// returns a new array each call and re-rendered the page on every action.
describe("selector reference stability", () => {
  beforeEach(() => {
    store.dispatch({
      type: "bookmarks/fetch/fulfilled",
      payload: [
        { id: 1, media_id: 7, timestamp_seconds: 10 },
        { id: 2, media_id: 8, timestamp_seconds: 20 },
      ],
    });
  });

  test("one instance returns a stable reference across unrelated actions", () => {
    const select = selectBookmarksByMediaId(7);
    const first = select(store.getState());

    store.dispatch({ type: "ui/openUpload" });

    expect(select(store.getState())).toBe(first);
  });

  test("a fresh instance per call does not — which was the bug", () => {
    const a = selectBookmarksByMediaId(7)(store.getState());
    const b = selectBookmarksByMediaId(7)(store.getState());
    expect(a).not.toBe(b);
  });

  test("a real change still propagates", () => {
    const select = selectBookmarksByMediaId(7);
    const before = select(store.getState());

    store.dispatch({ type: "bookmarks/create/fulfilled", payload: { id: 3, media_id: 7, timestamp_seconds: 30 } });

    expect(select(store.getState())).not.toBe(before);
    expect(select(store.getState())).toHaveLength(2);
  });

  // The list arrives sorted but createBookmark appends, so one added at an
  // earlier point than the last left the array out of order. NotesPanel walks
  // it assuming ascending time and stops at the first entry past the playhead.
  test("a bookmark added out of order is still returned sorted", () => {
    store.dispatch({ type: "bookmarks/create/fulfilled", payload: { id: 9, media_id: 7, timestamp_seconds: 5 } });

    const times = selectBookmarksByMediaId(7)(store.getState()).map((b) => b.timestamp_seconds);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[0]).toBe(5);
  });

  test("each id sees only its own rows", () => {
    expect(selectBookmarksByMediaId(7)(store.getState()).map((b) => b.id)).toEqual([1]);
    expect(selectBookmarksByMediaId(8)(store.getState()).map((b) => b.id)).toEqual([2]);
  });

  test("the transcript selector returns the stored entry itself", () => {
    store.dispatch({ type: "transcript/fetch/fulfilled", payload: { media_id: 7, status: "done" } });
    expect(selectTranscriptByMediaId(7)(store.getState())).toBe(transcript(7));
  });
});
