import { test, expect } from "vitest";
import { formatHebrewDate, formatLocalHebrewDate, formatShortHebrewDate, formatHebrewDateTime } from "./formatDate";

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

// ── The three gathered from their screens ───────────────────────────────────
//
// Moved, not changed: each must still be the private copy it replaced, for a
// missing value, a value that is not a date and a real one alike. (Midday UTC,
// so the calendar day is the same in any zone the suite runs in.)
const SAMPLES = [undefined, null, "", "not a date", "2026-09-07T12:00:00Z", 1788782400000];

test("formatLocalHebrewDate is the notes' copy, value for value", () => {
  const notesCopy = (value) =>
    value ? new Date(value).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : "";
  for (const value of SAMPLES) expect(formatLocalHebrewDate(value)).toBe(notesCopy(value));
  expect(formatLocalHebrewDate("2026-09-07T12:00:00Z")).toBe("7 בספטמבר 2026");
});

test("formatShortHebrewDate is the tag proposals' copy, value for value", () => {
  const proposalsCopy = (value) => (value ? new Date(value).toLocaleDateString("he-IL") : "");
  for (const value of SAMPLES) expect(formatShortHebrewDate(value)).toBe(proposalsCopy(value));
  expect(formatShortHebrewDate("2026-09-07T12:00:00Z")).toBe("7.9.2026");
});

test("formatHebrewDateTime is the sessions page's and the pipeline table's copy", () => {
  const copy = (value, empty) =>
    value ? new Date(value).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : empty;
  for (const value of SAMPLES) {
    expect(formatHebrewDateTime(value)).toBe(copy(value, ""));
    expect(formatHebrewDateTime(value, "—")).toBe(copy(value, "—"));
  }
});
