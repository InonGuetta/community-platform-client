import { test, expect, describe } from "vitest";
import { rejectionOf, messageForError, ERROR_CODES } from "./apiError";
import errors from "../locales/he/errors.json";

// The single funnel every thunk in the store rejects through — 42 call sites
// that were 42 copies of the same optional-chain, all of which read the message
// and dropped the code one layer before anything could translate it.

describe("what it takes from the API", () => {
  test("both halves of a real API error", () => {
    const err = { response: { data: { message: "Media not found", code: ERROR_CODES.MEDIA_NOT_FOUND } } };
    expect(rejectionOf(err, "Failed to fetch media")).toEqual({
      message: "Media not found",
      code: ERROR_CODES.MEDIA_NOT_FOUND,
    });
  });

  // Not every server error carries a specific code; the generic ones still ride
  // along, and the middleware simply finds no entry for them.
  test("a message with no code keeps the message", () => {
    expect(rejectionOf({ response: { data: { message: "Course title is required" } } }, "fb")).toEqual({
      message: "Course title is required",
      code: undefined,
    });
  });
});

describe("when there is no API error to read", () => {
  // The thunk's own fallback. This is the case that must not throw: a network
  // failure, an aborted request and a bug in the thunk body all arrive here as
  // errors with no `response` at all.
  test.each([
    ["a bare Error", new Error("boom")],
    ["null", null],
    ["undefined", undefined],
    ["an error with an empty response", { response: {} }],
    ["an error with a null body", { response: { data: null } }],
  ])("%s falls back to the supplied message", (_label, err) => {
    expect(rejectionOf(err, "Failed to fetch media")).toEqual({
      message: "Failed to fetch media",
      code: undefined,
    });
  });
});

// Most slices store `state.error = action.payload?.message`. Nothing renders
// those today, but a non-string would reach a user as "[object Object]" the day
// something does.
test("message is always a string", () => {
  for (const err of [null, new Error("x"), { response: { data: {} } }]) {
    expect(typeof rejectionOf(err, "Login failed").message).toBe("string");
  }
});

// messageForError is what SignIn/SignUp and the toast middleware both call.
describe("messageForError", () => {
  test("a known code becomes its Hebrew", () => {
    expect(messageForError({ code: ERROR_CODES.INVALID_CREDENTIALS }, "fb"))
      .toBe("אימייל או סיסמה שגויים");
    expect(messageForError({ code: ERROR_CODES.EMAIL_TAKEN }, "fb"))
      .toBe("האימייל כבר בשימוש");
  });

  // The bug this closes: the sign-in form rendered `state.error` directly, so a
  // wrong password showed the server's English "Invalid credentials" inside a
  // right-to-left Hebrew form. The English must never survive the lookup — not
  // as a value, and not as a fallback.
  test("the server's English message is never what comes out", () => {
    const rejection = { message: "Invalid credentials", code: ERROR_CODES.INVALID_CREDENTIALS };
    expect(messageForError(rejection, "ההתחברות נכשלה. נסה שוב.")).not.toContain("Invalid");

    // Even with no code at all, the fallback wins — the message is not consulted.
    expect(messageForError({ message: "Something went wrong" }, "ההתחברות נכשלה. נסה שוב."))
      .toBe("ההתחברות נכשלה. נסה שוב.");
  });

  test("anything unrecognisable degrades to the fallback instead of throwing", () => {
    for (const input of [null, undefined, "a bare string", {}, { code: "ADDED_LATER" }]) {
      expect(messageForError(input, "גיבוי")).toBe("גיבוי");
    }
  });

  test("every translated value is actually Hebrew, not a leftover English string", () => {
    // A Hebrew character must appear in each; an entry accidentally left in
    // English would otherwise sit there looking translated.
    for (const [code, text] of Object.entries(errors.codes)) {
      expect(text, `${code} is not Hebrew`).toMatch(/[֐-׿]/);
    }
  });
});
