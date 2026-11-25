import { test, expect } from "vitest";
import { lessonTitleForHeading } from "./lessonTitle";

test("drops one trailing full stop, and the space before it", () => {
  expect(lessonTitleForHeading("שמירת הברית.")).toBe("שמירת הברית");
  expect(lessonTitleForHeading("שמירת הברית .  ")).toBe("שמירת הברית");
});

test("leaves a title without one as it is", () => {
  expect(lessonTitleForHeading("שיעור בהלכות שבת")).toBe("שיעור בהלכות שבת");
  expect(lessonTitleForHeading("פרק א׳: מבוא")).toBe("פרק א׳: מבוא");
});

// An ellipsis is meaning, not punctuation to tidy away.
test("keeps an ellipsis", () => {
  expect(lessonTitleForHeading("ועוד...")).toBe("ועוד...");
  expect(lessonTitleForHeading("ועוד…")).toBe("ועוד…");
});

test("an absent title is an empty heading, never 'undefined'", () => {
  expect(lessonTitleForHeading(undefined)).toBe("");
  expect(lessonTitleForHeading(null)).toBe("");
});
