// @vitest-environment jsdom
import { describe, test, expect } from "vitest";
import { answerNote, questionBefore, canSaveAnswer, conversationText } from "./discussionNote";
import { sanitizeNoteHtml } from "./noteHtml";
import { isNoteAboutMedia, sourceFromChip, SOURCE_CHIP_SELECTOR } from "./noteSource";

// An answer from the chat, saved as a note in the lesson's notebook.

const book = { mediaId: 20, mediaTitle: "ספר התודעה", mediaType: "text" };
const recording = { mediaId: 4, mediaTitle: "שיעור בפרשת יתרו", mediaType: "video" };

const chipsOf = (html) => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return [...root.querySelectorAll(SOURCE_CHIP_SELECTOR)].map(sourceFromChip);
};

describe("the note", () => {
  test("is titled by the question, and holds the question and the answer", () => {
    const note = answerNote({ ...book, question: "  מה כתוב על תפילין?  ", answer: "של יד תחילה [1].", citations: [] });
    expect(note.title).toBe("מה כתוב על תפילין?");
    expect(note.body).toContain("<b>שאלה:</b> מה כתוב על תפילין?");
    expect(note.body).toContain("של יד תחילה [1].");
    expect(note.mediaId).toBe(20);
  });

  test("a title past the column's 200 is cut, not refused by the server", () => {
    expect(answerNote({ ...book, question: "א".repeat(500), answer: "x" }).title).toHaveLength(200);
  });

  test("each cited passage becomes a chip that opens its page in the book", () => {
    const note = answerNote({
      ...book,
      question: "ש",
      answer: "א [2] ב [1]",
      citations: [{ n: 2, page_number: 70, start_time: null }, { n: 1, page_number: 66, start_time: null }],
    });
    const chips = chipsOf(note.body);
    // In the order of their numbers, named by them.
    expect(chips.map((c) => [c.note, c.pageNumber, c.timestampSeconds])).toEqual([
      ["מקור 1", 66, null],
      ["מקור 2", 70, null],
    ]);
    expect(chips.every((c) => c.mediaId === 20 && c.mediaType === "text")).toBe(true);
  });

  test("in a recording, the chip opens the moment", () => {
    const note = answerNote({ ...recording, question: "ש", answer: "א [1]", citations: [{ n: 1, start_time: 754.6, page_number: null }] });
    const [chip] = chipsOf(note.body);
    expect(chip.timestampSeconds).toBe(754);
    expect(chip.pageNumber).toBe(null);
  });

  // The pair this file depends on: a chip the sanitizer strips is a chip that
  // vanishes the first time the note comes back from the database.
  test("survives the notebook's sanitizer unchanged", () => {
    const note = answerNote({
      ...book,
      question: "ש",
      answer: "פסקה ראשונה [1]\nשורה שנייה\n\nפסקה שנייה",
      citations: [{ n: 1, page_number: 66, start_time: null }],
    });
    expect(sanitizeNoteHtml(note.body)).toBe(note.body);
  });

  test("model output is text, never markup", () => {
    const note = answerNote({ ...book, question: "<img src=x onerror=alert(1)>", answer: "<script>x</script> & [1]", citations: [] });
    expect(note.body).not.toContain("<img");
    expect(note.body).not.toContain("<script");
    expect(note.body).toContain("&lt;script&gt;");
  });

  test("is listed under the lesson it came from", () => {
    const note = answerNote({ ...book, question: "ש", answer: "א [1]", citations: [{ n: 1, page_number: 66 }] });
    expect(isNoteAboutMedia({ media_id: note.mediaId, body: note.body }, 20)).toBe(true);
  });

  test("an answer that cites nothing has no references line", () => {
    expect(answerNote({ ...book, question: "ש", answer: "א" }).body).not.toContain("data-references");
  });
});

describe("which answer, and whether it can be saved", () => {
  const messages = [
    { id: 1, role: "user", content: "ראשונה" },
    { id: 2, role: "assistant", content: "א [1]", citations: [{ n: 1 }] },
    { id: 3, role: "user", content: "שנייה" },
    { id: 4, role: "assistant", content: "ב [1]", citations: [{ n: 1 }] },
  ];

  test("an answer answers the question just before it", () => {
    expect(questionBefore(messages, 4)).toBe("שנייה");
    expect(questionBefore(messages, 2)).toBe("ראשונה");
    expect(questionBefore(messages, 99)).toBe(null);
  });

  test("only a stored, cited answer", () => {
    expect(canSaveAnswer(messages[1])).toBe(true);
    expect(canSaveAnswer(messages[0])).toBe(false);
    expect(canSaveAnswer({ id: "draft-x", role: "assistant", citations: [{ n: 1 }], streaming: true })).toBe(false);
    expect(canSaveAnswer({ id: 5, role: "assistant", content: "לא נדון", citations: [] })).toBe(false);
  });
});

describe("the whole conversation as text", () => {
  const messages = [
    { id: 1, role: "user", content: " מה כתוב על תפילין? " },
    { id: 2, role: "assistant", content: "של יד תחילה [2], ואחר כך של ראש [1].", citations: [{ n: 2, page_number: 70 }, { n: 1, page_number: 66 }] },
    { id: 3, role: "user", content: "ומה עוד?" },
    { id: 4, role: "assistant", content: "לא נדון בספר.", citations: [] },
  ];

  test("each question, its answer, and where each [n] points", () => {
    expect(conversationText(messages, { mediaTitle: "ספר התודעה " })).toBe([
      "דיון עם בינה מלאכותית — ספר התודעה",
      "",
      "שאלה: מה כתוב על תפילין?",
      "תשובה: של יד תחילה [2], ואחר כך של ראש [1].",
      "מקורות: [1] עמ' 66 · [2] עמ' 70",
      "",
      "שאלה: ומה עוד?",
      "תשובה: לא נדון בספר.",
    ].join("\n"));
  });

  test("a moment in a recording is its minute, as on the chip", () => {
    const text = conversationText([{ id: 2, role: "assistant", content: "א [1]", citations: [{ n: 1, start_time: 754 }] }]);
    expect(text).toContain("[1] 12:34");
  });

  test("what is still on its way is not copied", () => {
    const text = conversationText([
      { id: 1, role: "user", content: "ראשונה" },
      { id: "pending-r", role: "user", content: "בדרך", pending: true },
      { id: "draft-r", role: "assistant", content: "חצי", streaming: true },
    ]);
    expect(text).toBe("שאלה: ראשונה");
  });
});
