import { test, expect, describe } from "vitest";
import { partOfDay } from "./greeting";
import { questionsIn } from "./suggestedQuestions";
import { squareCrop, looksLikePicture, MAX_SOURCE_BYTES } from "./avatarImage";

describe("partOfDay — the archive's greeting", () => {
  const at = (hour, minute = 0) => new Date(2026, 10, 17, hour, minute);
  test.each([
    [4, 59, "night"],
    [5, 0, "morning"],
    [11, 59, "morning"],
    [12, 0, "afternoon"],
    [16, 59, "afternoon"],
    [17, 0, "evening"],
    [20, 59, "evening"],
    [21, 0, "night"],
    [0, 0, "night"],
  ])("%i:%i is %s", (hour, minute, part) => {
    expect(partOfDay(at(hour, minute))).toBe(part);
  });
});

describe("questionsIn — a lesson's suggested questions in the reader's language", () => {
  const stored = { he: ["מה?"], en: ["What?"] };
  test("the reader's own language, when the lesson has it", () => {
    expect(questionsIn(stored, "en")).toEqual(["What?"]);
    expect(questionsIn(stored, "he")).toEqual(["מה?"]);
  });
  test("nothing — so the fixed questions in that language — when it does not", () => {
    expect(questionsIn(stored, "fr")).toBe(null);
    expect(questionsIn({ fr: [] }, "fr")).toBe(null);
    expect(questionsIn(null, "en")).toBe(null);
  });
  // A row from before migration 053 holds one Hebrew list: Hebrew only.
  test("an older lesson's Hebrew list is offered in Hebrew and nowhere else", () => {
    expect(questionsIn(["מה?"], "he")).toEqual(["מה?"]);
    expect(questionsIn(["מה?"], "en")).toBe(null);
  });
});

describe("the profile picture's shape", () => {
  test("the middle square of a picture of any shape", () => {
    expect(squareCrop(400, 300)).toEqual({ sx: 50, sy: 0, size: 300 });
    expect(squareCrop(300, 400)).toEqual({ sx: 0, sy: 50, size: 300 });
    expect(squareCrop(256, 256)).toEqual({ sx: 0, sy: 0, size: 256 });
  });
  test("only a picture-sized picture is worth decoding", () => {
    expect(looksLikePicture(new Blob(["x"], { type: "image/png" }))).toBe(true);
    expect(looksLikePicture(new Blob(["x"], { type: "" }))).toBe(true);
    expect(looksLikePicture(new Blob(["x"], { type: "application/pdf" }))).toBe(false);
    expect(looksLikePicture(new Blob([], { type: "image/png" }))).toBe(false);
    expect(looksLikePicture({ size: MAX_SOURCE_BYTES + 1, type: "image/jpeg" })).toBe(false);
    expect(looksLikePicture(null)).toBe(false);
  });
});
