import { test, expect } from "vitest";
import { countLabel } from "./countLabel";

// The three forms that were wrong on screen before this existed: "1 שיעורים",
// "0 שיעורים", and the same pair on the collections page.
test("one is the singular phrase, not the digit", () => {
  expect(countLabel(1, "שיעור אחד", "שיעורים")).toBe("שיעור אחד");
});

test("none says אין rather than counting to zero", () => {
  expect(countLabel(0, "שיעור אחד", "שיעורים")).toBe("אין שיעורים");
});

test("more than one counts normally", () => {
  expect(countLabel(4, "שיעור אחד", "שיעורים")).toBe("4 שיעורים");
});

// The whole reason `one` is a phrase and not a noun: the word for "one" is
// gendered, so a helper that appended it would be wrong for every feminine noun.
test("a feminine noun keeps its own form of one", () => {
  expect(countLabel(1, "רשימה אחת", "רשימות")).toBe("רשימה אחת");
});

// item_count arrives from the server and is absent on a row the client built
// itself, so a missing or unparseable count must read as empty rather than as
// "NaN שיעורים".
test("a missing or unusable count reads as empty", () => {
  expect(countLabel(undefined, "שיעור אחד", "שיעורים")).toBe("אין שיעורים");
  expect(countLabel(null, "שיעור אחד", "שיעורים")).toBe("אין שיעורים");
  expect(countLabel("לא מספר", "שיעור אחד", "שיעורים")).toBe("אין שיעורים");
  expect(countLabel(-3, "שיעור אחד", "שיעורים")).toBe("אין שיעורים");
});

// The server sends counts as ::int, but a JSON round trip through a form or a
// query string can deliver the same value as a string.
test("a numeric string counts as its number", () => {
  expect(countLabel("1", "שיעור אחד", "שיעורים")).toBe("שיעור אחד");
  expect(countLabel("7", "שיעור אחד", "שיעורים")).toBe("7 שיעורים");
});
