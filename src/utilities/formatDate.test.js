import { test, expect } from "vitest";
import { formatHebrewDate, formatShortHebrewDate, formatHebrewDateTime } from "./formatDate";

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

test("the short date follows the same rule: Israel's day, nothing for a non-date", () => {
  expect(formatShortHebrewDate("2026-09-07T12:00:00Z")).toBe("7.9.2026");
  expect(formatShortHebrewDate("2026-09-06T23:30:00Z")).toBe("7.9.2026");
  expect(formatShortHebrewDate(undefined)).toBe("");
  expect(formatShortHebrewDate("not a date")).toBe("");
});

// A session's time is the reader's own clock — it is typed into a
// datetime-local field — so it is compared with the same formatting done here.
test("a date and time is the reader's clock, with the caller's placeholder for nothing", () => {
  const value = "2026-09-07T16:30:00Z";
  expect(formatHebrewDateTime(value)).toBe(
    new Date(value).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })
  );
  expect(formatHebrewDateTime(null)).toBe("");
  expect(formatHebrewDateTime(null, "—")).toBe("—");
  expect(formatHebrewDateTime("not a date", "—")).toBe("—");
});
