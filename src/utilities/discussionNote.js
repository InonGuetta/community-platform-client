import { sourceChipHtml, referencesBlockHtml } from "./noteSource";

// An answer from the "דיון עם בינה מלאכותית" chat, saved as a note in the
// lesson's notebook (PRD ASK-4).
//
// The note is an ordinary note — nothing in the notebook knows it came from the
// chat. Its body is the question, then the answer as it was given (its [n]
// markers kept), then a references line with one SOURCE CHIP per cited passage:
// the same chip a dragged bookmark becomes, so each one opens the recording at
// its minute or the book at its page, exports as a footnote, and is listed under
// the lesson (isNoteAboutMedia) — all of which the chip already does.
//
// Each chip is named "מקור n", the number its [n] in the text has, so the reader
// can tell which chip a marker means.
//
// The text is escaped here rather than trusted: an answer is model output, and
// the note body is HTML that will be rendered. It is also what the notebook's
// sanitizer (noteHtml.js) allows — <p>, <b>, <br> and the chip — so nothing is
// stripped on the way back from the database; noteHtml is the test of that.

// notes.title is VARCHAR(200) (migration 011); the server refuses longer.
const NOTE_TITLE_MAX = 200;

const escapeHtml = (text) =>
  String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Paragraphs as the model wrote them: a blank line starts a new one, a single
// line break stays one.
const paragraphs = (text) =>
  String(text ?? "")
    .trim()
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");

export const citationChipHtml = (citation, { mediaId, mediaTitle, mediaType }) =>
  sourceChipHtml({
    mediaId: Number(mediaId),
    // A citation carries one of the two, as its passage did: a moment in a
    // recording, or a page of a book. The other is null.
    timestampSeconds: Number.isFinite(citation.start_time) ? citation.start_time : null,
    pageNumber: Number.isInteger(citation.page_number) ? citation.page_number : null,
    mediaTitle,
    note: `מקור ${citation.n}`,
    mediaType,
  });

/**
 * The note for one answer: `{ title, body, mediaId }`, ready for createNote.
 * Titled by the question, which is what the reader will look for it by.
 */
export const answerNote = ({ question, answer, citations = [], mediaId, mediaTitle, mediaType }) => {
  const chips = [...citations]
    .sort((a, b) => Number(a.n) - Number(b.n))
    .map((c) => citationChipHtml(c, { mediaId, mediaTitle, mediaType }))
    .join("");
  const asked = String(question ?? "").trim();
  return {
    title: asked.slice(0, NOTE_TITLE_MAX),
    body:
      `<p><b>שאלה:</b> ${escapeHtml(asked)}</p>` +
      paragraphs(answer) +
      (chips ? referencesBlockHtml(chips) : ""),
    mediaId: Number(mediaId),
  };
};

/**
 * The question an answer answers: the nearest question before it in the
 * conversation. null when there is none — an answer cannot be saved without
 * saying what it answers.
 */
export const questionBefore = (messages, answerId) => {
  const at = messages.findIndex((m) => m.id === answerId);
  for (let i = at - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return null;
};

// Whether an answer can be saved: stored (a numeric id, not a draft still being
// written) and grounded — an answer with no citation is "not discussed in this
// lesson", which is nothing to keep.
export const canSaveAnswer = (message) =>
  message.role === "assistant" &&
  Number.isInteger(message.id) &&
  !message.streaming &&
  (message.citations?.length ?? 0) > 0;
