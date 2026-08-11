// @vitest-environment jsdom
// Opted in per the note in vite.config.js: this module parses HTML with
// DOMParser, so unlike most utilities here it genuinely needs a DOM.
import { test, expect, describe } from "vitest";
import { sanitizeNoteHtml, noteBodyToHtml, noteHtmlToPlainText, isNoteHtmlEmpty } from "./noteHtml";

// notes.body changed meaning when the toolbar arrived: it holds markup now, and
// it holds the plain text of every note written before that. Both readings have
// to keep working, and neither is visible from the column's type.

describe("what the toolbar writes survives", () => {
  test("the formatting marks are kept", () => {
    expect(sanitizeNoteHtml("<b>מודגש</b> ו<i>נטוי</i>")).toBe("<b>מודגש</b> ו<i>נטוי</i>");
    expect(sanitizeNoteHtml("<ul><li>ראשון</li></ul>")).toBe("<ul><li>ראשון</li></ul>");
  });

  test("a colour and a highlight are kept, as the two properties they are", () => {
    expect(sanitizeNoteHtml('<span style="color: #d32f2f">אדום</span>'))
      .toBe('<span style="color: #d32f2f">אדום</span>');
    expect(sanitizeNoteHtml('<span style="background-color: #fff59d">מודגש</span>'))
      .toBe('<span style="background-color: #fff59d">מודגש</span>');
  });

  // Browsers disagree about how they record a size — some write CSS, some still
  // reach for <font size> — so both survive, and both are validated.
  test("a size survives in either shape the browser writes it", () => {
    expect(sanitizeNoteHtml('<span style="font-size: x-large">גדול</span>'))
      .toBe('<span style="font-size: x-large">גדול</span>');
    expect(sanitizeNoteHtml('<font size="5">גדול</font>')).toBe('<font size="5">גדול</font>');
  });

  test("a size outside the command's own scale is not a size", () => {
    expect(sanitizeNoteHtml('<font size="9">א</font>')).toBe("<font>א</font>");
    expect(sanitizeNoteHtml('<span style="font-size: 40vw">א</span>')).toBe("<span>א</span>");
  });

  test("a pixel size survives, since that is what the toolbar now writes", () => {
    expect(sanitizeNoteHtml('<span style="font-size: 37px">גדול</span>'))
      .toBe('<span style="font-size: 37px">גדול</span>');
  });
});

describe("images pasted into a note", () => {
  const PIXEL = "data:image/png;base64,iVBORw0KGgo=";

  test("an embedded image is kept", () => {
    expect(sanitizeNoteHtml(`<img src="${PIXEL}" alt="">`)).toBe(`<img src="${PIXEL}" alt="">`);
  });

  // An SVG is a document, not a picture: it can carry script and fetch its own
  // references. The raster formats cannot execute anything.
  test("an svg is not accepted as an image", () => {
    expect(sanitizeNoteHtml('<img src="data:image/svg+xml;base64,PHN2Zz4=">')).toBe("");
  });

  // Images live inside the note as data: URLs, so a remote src is either
  // something pasted from elsewhere or a tracking pixel — and a note that
  // depends on someone else's server is a note that can break.
  test("a remote image is dropped rather than left broken", () => {
    expect(sanitizeNoteHtml('<img src="https://example.com/a.png">')).toBe("");
    expect(sanitizeNoteHtml('<img src="x" onerror="steal()">')).toBe("");
  });

  test("an image counts as content in the text the list and search read", () => {
    expect(noteHtmlToPlainText(`<img src="${PIXEL}">`)).toBe("[תמונה]");
    expect(isNoteHtmlEmpty(`<img src="${PIXEL}">`)).toBe(false);
  });
});

// The zero-width space RichNoteEditor parks inside a freshly-sized span so the
// caret has somewhere to sit. It is scaffolding, and a note holding only that is
// still an empty note — otherwise the placeholder would never come back after
// someone pressed a size button and changed their mind.
test("the caret holder is not content", () => {
  expect(isNoteHtmlEmpty(`<span style="font-size: 24px">\u200B</span>`)).toBe(true);
  expect(noteHtmlToPlainText(`<span style="font-size: 24px">\u200Bטקסט</span>`)).toBe("טקסט");
});

describe("what does not belong in a note is taken off", () => {
  // The body goes through a database and comes back as input. These are not
  // attacks a user can mount on anyone but themselves — a note is private — but
  // the string is untrusted by the time it is rendered, whatever its origin.
  test("a script is removed with its contents, not unwrapped into text", () => {
    expect(sanitizeNoteHtml("<b>לפני</b><script>alert(1)</script>")).toBe("<b>לפני</b>");
  });

  test("an event handler cannot ride in on an allowed tag", () => {
    expect(sanitizeNoteHtml('<b onclick="steal()">טקסט</b>')).toBe("<b>טקסט</b>");
  });

  test("a style attribute keeps only its colours", () => {
    const cleaned = sanitizeNoteHtml('<span style="color: red; position: fixed; background: url(x)">א</span>');
    expect(cleaned).toBe('<span style="color: red">א</span>');
  });

  test("a colour that is really a url is not a colour", () => {
    expect(sanitizeNoteHtml('<span style="color: url(javascript:alert(1))">א</span>')).toBe("<span>א</span>");
  });

  // An unknown tag costs the tag, never the sentence inside it.
  test("a tag that is not allowed is unwrapped, keeping the writing", () => {
    expect(sanitizeNoteHtml("<article>מה שכתבתי</article>")).toBe("מה שכתבתי");
  });

  // Depth matters: cleaning the parent first would let a child be lifted into a
  // position the walk had already passed.
  test("a forbidden tag nested inside an unwrapped one is still removed", () => {
    expect(sanitizeNoteHtml("<article><script>alert(1)</script>טקסט</article>")).toBe("טקסט");
  });
});

describe("notes written before the toolbar existed", () => {
  test("plain text keeps its line breaks instead of collapsing", () => {
    expect(noteBodyToHtml("שורה\nשנייה")).toBe("שורה<br>שנייה");
  });

  test("plain text is escaped, so it is read as writing and not as markup", () => {
    expect(noteBodyToHtml("a < b & c")).toBe("a &lt; b &amp; c");
  });

  // The distinction is made on the tags this file allows, so a note that merely
  // mentions "<" is not mistaken for markup — the rest of that line would be
  // swallowed by a parser.
  test("text containing an angle bracket is not mistaken for markup", () => {
    expect(noteHtmlToPlainText("2 < 3")).toBe("2 < 3");
  });
});

describe("the words, with the markup taken off", () => {
  test("a line break is text, not nothing", () => {
    expect(noteHtmlToPlainText("שורה<br>שנייה")).toBe("שורה\nשנייה");
    expect(noteHtmlToPlainText("<div>אחת</div><div>שתיים</div>")).toBe("אחת\nשתיים");
  });

  test("the preview shows the writing, not the tag names", () => {
    expect(noteHtmlToPlainText('<span style="background-color: #fff59d"><b>חשוב</b></span>')).toBe("חשוב");
  });

  // What an emptied contentEditable actually leaves behind. Without this the
  // placeholder would never return after the first thing the user deleted.
  test("what an emptied editor leaves behind counts as empty", () => {
    expect(isNoteHtmlEmpty("<div><br></div>")).toBe(true);
    expect(isNoteHtmlEmpty("")).toBe(true);
    expect(isNoteHtmlEmpty("<b>א</b>")).toBe(false);
  });
});
