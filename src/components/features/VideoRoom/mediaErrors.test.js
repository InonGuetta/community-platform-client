import { test, expect, describe } from "vitest";
import { describeMediaError, mediaDevicesUnavailable } from "./mediaErrors";

const HEBREW = /[֐-׿]/;

describe("each failure says something the user can act on", () => {
  test.each([
    ["NotAllowedError", /הרשאה/],
    ["NotFoundError", /לא נמצאו/],
    ["NotReadableError", /תפוסים/],
    ["OverconstrainedError", /תומכת/],
    ["AbortError", /הופסקה/],
  ])("%s produces a specific message", (name, expected) => {
    expect(describeMediaError({ name }, { secureContext: true })).toMatch(expected);
  });

  test("an unrecognised error still gets a usable message", () => {
    const message = describeMediaError({ name: "SomethingNew" }, { secureContext: true });
    expect(message).toMatch(HEBREW);
    expect(message.length).toBeGreaterThan(20);
  });

  test("a null error does not throw", () => {
    expect(typeof describeMediaError(null, { secureContext: true })).toBe("string");
  });
});

// getUserMedia needs a secure context, so plain HTTP on a LAN address can never
// work. Without naming it, the browser's error reads as a permission problem
// and the deployment issue gets debugged as a code bug.
test("an insecure context names HTTPS instead of blaming permissions", () => {
  const message = describeMediaError({ name: "NotAllowedError" }, { secureContext: false });
  expect(message).toMatch(/HTTPS/);
  expect(message).not.toMatch(/נחסמה/);
});

describe("detecting an unusable browser", () => {
  test.each([
    ["no navigator", undefined],
    ["no mediaDevices", {}],
    ["mediaDevices without getUserMedia", { mediaDevices: {} }],
  ])("%s counts as unavailable", (_label, nav) => {
    expect(mediaDevicesUnavailable(nav)).toBe(true);
  });

  test("a working browser is available", () => {
    expect(mediaDevicesUnavailable({ mediaDevices: { getUserMedia: () => {} } })).toBe(false);
  });
});

test("every message is Hebrew and non-empty", () => {
  const names = ["NotAllowedError", "NotFoundError", "NotReadableError", "OverconstrainedError", "AbortError", "Unknown"];
  const messages = [
    ...names.map((name) => describeMediaError({ name }, { secureContext: true })),
    describeMediaError(null, { secureContext: false }),
  ];
  for (const message of messages) {
    expect(message).toMatch(HEBREW);
    expect(message.trim().length).toBeGreaterThan(15);
  }
});
