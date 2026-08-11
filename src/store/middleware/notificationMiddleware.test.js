import { test, expect, describe } from "vitest";
import { notificationMiddleware } from "./notificationMiddleware";
import { ERROR_CODES, ERROR_CODE_HE, rejectionOf } from "../../utilities/apiError";

// The Hebrew a user sees is chosen by the error CODE. It used to be chosen by
// matching the server's English message character for character, and the whole
// point of these tests is the one they would have caught: a message reworded on
// the server silently losing its translation, with nothing failing anywhere.

// Runs one action through the middleware and returns the toasts it dispatched.
const run = (action) => {
  const dispatched = [];
  const store = { dispatch: (a) => dispatched.push(a), getState: () => ({}) };
  const passedThrough = [];
  notificationMiddleware(store)((a) => passedThrough.push(a))(action);
  return { toasts: dispatched, passedThrough };
};

const rejectedWith = (type, data) => ({
  type,
  payload: rejectionOf({ response: { data } }, "unused fallback"),
});

const messageOf = ({ toasts }) => toasts[0]?.payload?.message;

test("the action reaches the next middleware before any toast is decided", () => {
  const action = rejectedWith("media/upload/rejected", { code: ERROR_CODES.FORBIDDEN });
  const { passedThrough } = run(action);
  expect(passedThrough).toEqual([action]);
});

describe("choosing the Hebrew", () => {
  test("a known code produces its specific message", () => {
    const result = run(
      rejectedWith("media/fetchAll/rejected", {
        code: ERROR_CODES.MEDIA_NOT_FOUND,
        message: "Media not found",
      })
    );
    expect(messageOf(result)).toBe("המדיה לא נמצאה");
    expect(result.toasts[0].payload.severity).toBe("error");
  });

  // The regression this refactor exists to prevent. Same code, completely
  // different prose: the user must still get the specific Hebrew. Under the old
  // message-keyed map this fell through to the generic per-action text.
  test("rewording the server's message changes nothing", () => {
    const before = run(
      rejectedWith("users/update/rejected", {
        code: ERROR_CODES.EMAIL_TAKEN,
        message: "Email already in use",
      })
    );
    const after = run(
      rejectedWith("users/update/rejected", {
        code: ERROR_CODES.EMAIL_TAKEN,
        message: "That email address is already registered to another account",
      })
    );
    expect(messageOf(before)).toBe("האימייל כבר בשימוש");
    expect(messageOf(after)).toBe(messageOf(before));
  });

  // Four resources share NOT_FOUND at the HTTP level. Distinguishing them is why
  // the specific codes were added rather than keying on the five generic ones.
  test("resources that share a status still get their own sentence", () => {
    const said = (code) =>
      messageOf(run(rejectedWith("media/fetchAll/rejected", { code })));

    const messages = [
      said(ERROR_CODES.MEDIA_NOT_FOUND),
      said(ERROR_CODES.SESSION_NOT_FOUND),
      said(ERROR_CODES.BOOKMARK_NOT_FOUND),
      said(ERROR_CODES.TRANSCRIPT_NOT_FOUND),
    ];
    expect(new Set(messages).size).toBe(4);
  });

  test("an unknown code falls back to the per-action message", () => {
    const result = run(
      rejectedWith("media/fetchAll/rejected", { code: "SOMETHING_ADDED_LATER" })
    );
    expect(messageOf(result)).toBe("טעינת המדיה נכשלה");
  });

  // A thunk's own fallback carries no code at all — the request never reached a
  // server that could supply one.
  test("no code at all falls back to the per-action message", () => {
    const result = run({
      type: "media/fetchAll/rejected",
      payload: rejectionOf(new Error("boom"), "Failed to fetch media"),
    });
    expect(messageOf(result)).toBe("טעינת המדיה נכשלה");
  });
});

describe("staying quiet", () => {
  // Blanket "toast on every rejection" would fire for auth/fetchMe on every
  // anonymous visit and for transcript/fetch on every poll of a transcript that
  // is not ready yet.
  test("an uncurated action produces no toast, however specific its code", () => {
    expect(run(rejectedWith("auth/fetchMe/rejected", { code: ERROR_CODES.UNAUTHORIZED })).toasts)
      .toEqual([]);
    expect(run(rejectedWith("transcript/fetch/rejected", { code: ERROR_CODES.TRANSCRIPT_NOT_FOUND })).toasts)
      .toEqual([]);
  });

  test("a pending action produces no toast", () => {
    expect(run({ type: "media/upload/pending" }).toasts).toEqual([]);
  });

  test("an action that is not a thunk outcome is ignored", () => {
    expect(run({ type: "ui/uploadProgress", payload: 42 }).toasts).toEqual([]);
  });
});

test("success toasts still fire for curated mutations", () => {
  const result = run({ type: "media/upload/fulfilled", payload: { id: 1 } });
  expect(messageOf(result)).toBe("המדיה הועלתה בהצלחה");
  expect(result.toasts[0].payload.severity).toBe("success");
});

// A code-keyed map can still drift in one way: a key that is not a real code.
// It fails exactly as silently as the prose keys did — the lookup just misses —
// so it is worth an assertion. This cannot see across the two repositories; it
// checks this client's mirror is self-consistent, and the mirror's own header
// carries the "edit both together" warning for the half a test cannot reach.
test("every translated key is a code this client actually knows", () => {
  const known = new Set(Object.values(ERROR_CODES));
  const unknown = Object.keys(ERROR_CODE_HE).filter((code) => !known.has(code));
  expect(unknown).toEqual([]);
});

test("no two codes share a value, so no translation can shadow another", () => {
  const values = Object.values(ERROR_CODES);
  expect(values.length).toBe(new Set(values).size);
});
