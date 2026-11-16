import { test, expect, afterEach } from "vitest";
import i18n from "../i18n/i18n";
import { processingReasonText } from "./processingReason";
import { messageForError, rejectionOf, ERROR_CODES } from "./apiError";

afterEach(async () => {
  i18n.removeResourceBundle("en", "errors");
  await i18n.changeLanguage("he");
});

const stored = (code, params) => JSON.stringify({ code, ...(params && { params }) });

test("a stored code is worded, with its params", () => {
  expect(processingReasonText(stored("DOCUMENT_TOO_SHORT", { words: 12, min: 50 }))).toBe(
    "לא נמצא מספיק טקסט קריא בקובץ (12 מילים). נדרשות לפחות 50 מילים להפקת סיכום."
  );
  expect(processingReasonText(stored("DOCUMENT_SCANNED"))).toMatch(/סרוק/);
});

test("the same row reads in the reader's language", async () => {
  i18n.addResourceBundle("en", "errors", { codes: { DOCUMENT_NO_TEXT: "No readable text in the file." } }, true, true);
  await i18n.changeLanguage("en");
  expect(processingReasonText(stored("DOCUMENT_NO_TEXT"))).toBe("No readable text in the file.");
});

// Rows written before codes were stored hold a Hebrew sentence.
test("an older row's sentence shows in Hebrew, and gives way to the fallback elsewhere", async () => {
  expect(processingReasonText("לא נמצא טקסט קריא בקובץ.", "fb")).toBe("לא נמצא טקסט קריא בקובץ.");
  await i18n.changeLanguage("en");
  expect(processingReasonText("לא נמצא טקסט קריא בקובץ.", "fb")).toBe("fb");
});

test("nothing stored, or a code we do not know, is the fallback", () => {
  expect(processingReasonText(null, "fb")).toBe("fb");
  expect(processingReasonText(stored("ADDED_LATER"), "fb")).toBe("fb");
});

test("an error's params reach its sentence", () => {
  const rejection = rejectionOf(
    { response: { data: { message: "At most 20 tags per item", code: ERROR_CODES.TAG_LIMIT, params: { max: 20 } } } },
    "fb"
  );
  expect(rejection.params).toEqual({ max: 20 });
  expect(messageForError(rejection, "fb")).toBe("ניתן לשייך עד 20 תגיות לפריט");
});

// INVALID_EMAIL's sentence is the client's own emailShape reason, chosen by
// the server's params.reason — the same words the form shows before sending.
test("an invalid address is worded by which check failed", () => {
  expect(messageForError({ code: ERROR_CODES.INVALID_EMAIL, params: { reason: "noSuffix" } }, "fb")).toBe(
    i18n.t("auth:emailShape.noSuffix")
  );
});
