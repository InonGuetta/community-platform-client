import { test, expect } from "vitest";
import { truncateWords } from "./truncateWords";

test("a short text is returned untouched", () => {
  expect(truncateWords("שיעור קצר", 8)).toBe("שיעור קצר");
});

test("a long text is cut to the word limit and marked", () => {
  expect(truncateWords("אחת שתיים שלוש ארבע חמש שש", 3)).toBe("אחת שתיים שלוש…");
});

test("exactly the limit is not marked as cut", () => {
  expect(truncateWords("אחת שתיים שלוש", 3)).toBe("אחת שתיים שלוש");
});

// A note is written in a textarea, so it arrives with newlines and runs of
// spaces. The header is one line, and it has to stay one line.
test("newlines and double spaces collapse to single spaces", () => {
  expect(truncateWords("שורה ראשונה\nשורה  שנייה", 8)).toBe("שורה ראשונה שורה שנייה");
});

test("an empty, blank or missing note yields an empty string, not a stray ellipsis", () => {
  expect(truncateWords("", 8)).toBe("");
  expect(truncateWords("   \n  ", 8)).toBe("");
  expect(truncateWords(null, 8)).toBe("");
  expect(truncateWords(undefined, 8)).toBe("");
});
