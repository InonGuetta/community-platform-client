import { test, expect, beforeAll, afterAll } from "vitest";
import i18n from "../i18n/i18n";
import { roleLabels, mediaTypeLabels, defaultCreatorName } from "./constant";
import { DURATION_OPTIONS, lengthLabel } from "./durationOptions";
import { formatDate, formatNumber } from "./formatDate";
import { creatorDisplayName } from "./creatorPage";

// utilities/ words what it returns in the interface's language at the moment it
// is called — not when the module loaded. Shown here with a few English strings
// added for the test, since the real translations come later in the plan.

beforeAll(() => {
  i18n.addResourceBundle("en", "format", {
    roles: { student: "Student" },
    mediaTypes: { audio: "Audio" },
    duration: { short: "0–15 min", minutes: "{{n}} min" },
    creatorNone: "General",
  });
});
afterAll(() => i18n.removeResourceBundle("en", "format"));

test("the label maps read the language that is current when they are read", async () => {
  expect(roleLabels.student).toBe("תלמיד");
  await i18n.changeLanguage("en");
  expect(roleLabels.student).toBe("Student");
  expect(mediaTypeLabels.audio).toBe("Audio");
  // A key the English strings do not have yet falls back to Hebrew.
  expect(roleLabels.admin).toBe("מנהל");
});

test("the label maps still behave like plain objects", () => {
  expect(Object.keys(mediaTypeLabels)).toEqual(["video", "audio", "text"]);
  expect(Object.entries(roleLabels).map(([key]) => key)).toEqual(["student", "lecturer", "admin"]);
});

test("durations and the length filter's labels follow the language", async () => {
  await i18n.changeLanguage("en");
  expect(DURATION_OPTIONS[0].label).toBe("0–15 min");
  expect(lengthLabel(42 * 60)).toBe("42 min");
});

test("dates and numbers are formatted in the current language", async () => {
  const day = "2026-09-07T10:00:00Z";
  expect(formatDate(day)).toMatch(/ספטמבר/);
  await i18n.changeLanguage("en");
  expect(formatDate(day)).toBe("September 7, 2026");
  expect(formatNumber(12345)).toBe("12,345");
});

test("the stored 'nobody' is shown in the current language; a real name is shown as written", async () => {
  expect(creatorDisplayName(defaultCreatorName)).toBe("כללי");
  await i18n.changeLanguage("en");
  expect(creatorDisplayName(defaultCreatorName)).toBe("General");
  expect(creatorDisplayName("הרב כהן")).toBe("הרב כהן");
});
