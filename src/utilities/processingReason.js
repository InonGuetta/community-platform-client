import i18n from "../i18n/i18n";

// Why a lesson's processing failed, as the worker STORED it — in
// transcripts.error_message and in a processing_error notification's
// `reason` — worded in the reader's language.
//
// The server stores a code and its params as JSON (storedReason in the
// server's lib/AppError.js): {"code":"DOCUMENT_TOO_SHORT","params":{"words":12,"min":50}}.
// Rows written before that hold a Hebrew sentence; it is shown as written in
// Hebrew and not at all in another language, where a sentence the reader cannot
// read is worse than the generic fallback the caller supplies.
export const processingReasonText = (stored, fallback = null) => {
  if (!stored) return fallback;
  let parsed = null;
  try {
    parsed = JSON.parse(stored);
  } catch {
    // An older row's sentence.
  }
  if (parsed && typeof parsed.code === "string") {
    return i18n.t(`errors:codes.${parsed.code}`, { ...parsed.params, defaultValue: "" }) || fallback;
  }
  return i18n.language === "he" && typeof stored === "string" ? stored : fallback;
};
