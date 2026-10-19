import { test, expect } from "vitest";
import { formatHebrewDate } from "./formatDate";

test("a timestamp is a Hebrew calendar date", () => {
  expect(formatHebrewDate("2026-09-07T10:00:00Z")).toBe("7 בספטמבר 2026");
});

// 23:30 UTC on the 6th is already the 7th in Israel — the day the archive's date
// filter puts the lesson on, so the page must say the same day.
test("the day is Israel's, not the reader's machine's", () => {
  expect(formatHebrewDate("2026-09-06T23:30:00Z")).toBe("7 בספטמבר 2026");
});

test("nothing for a value that is not a date", () => {
  expect(formatHebrewDate(null)).toBe("");
  expect(formatHebrewDate("")).toBe("");
  expect(formatHebrewDate("not a date")).toBe("");
});
