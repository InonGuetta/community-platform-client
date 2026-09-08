// @vitest-environment jsdom
// Opted in per the note in vite.config.js: this module parses HTML with
// DOMParser, so unlike most utilities here it genuinely needs a DOM.
import { test, expect, describe } from "vitest";
import { sanitizeNoteHtml, noteBodyToHtml, noteHtmlToPlainText, isNoteHtmlEmpty } from "./noteHtml";
import { sourceChipHtml, sourceFromChip, SOURCE_CHIP_SELECTOR } from "./noteSource";

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

// A bookmark dragged into a note becomes a chip in the note's body, which means
// two files have to agree: noteSource.js builds the markup, noteHtml.js decides
// what markup is allowed to come back out of the database. They are in separate
// modules on purpose — one is about a feature, the other about safety — and
// that is exactly the arrangement that drifts, so the agreement is asserted
// here rather than described in a comment in each.
describe("a source chip, dragged in from the sidebar", () => {
  const chip = sourceChipHtml({
    mediaId: 12, timestampSeconds: 742, mediaTitle: "בבא קמא ב", note: "בעניין יתרו", mediaType: "audio",
  });

  test("what noteSource builds is what the sanitizer lets back through", () => {
    const cleaned = sanitizeNoteHtml(chip);

    expect(cleaned).toContain('data-media-id="12"');
    expect(cleaned).toContain('data-timestamp="742"');
    expect(cleaned).toContain('data-media-title="בבא קמא ב"');
    // The bookmark's own title, which only the export's footnote prints — and
    // which is therefore the attribute most likely to be dropped by a
    // sanitizer nobody told about it.
    expect(cleaned).toContain('data-note="בעניין יתרו"');
    // Without this the caret walks into the chip and the reference can be
    // edited one letter at a time into something that points nowhere.
    expect(cleaned).toContain('contenteditable="false"');
  });

  test("a chip survives a round-trip and still names its lecture", () => {
    const body = document.createElement("div");
    body.innerHTML = noteBodyToHtml(sanitizeNoteHtml(`כתוב כאן ${chip} והמשך`));

    expect(sourceFromChip(body.querySelector(SOURCE_CHIP_SELECTOR))).toEqual({
      mediaId: 12,
      timestampSeconds: 742,
      mediaTitle: "בבא קמא ב",
      note: "בעניין יתרו",
      mediaType: "audio",
      // Absent, not missing. A recording has no paragraph and no page, and a
      // chip written before books were bookmarkable reads the same way — which
      // is what lets the source window branch on chunkId being an integer.
      chunkId: null,
      pageNumber: null,
      // The bookmark's own words, which is what the source window prints in its
      // header — not the chip's raw text, which is two lines now.
      noteText: "בעניין יתרו",
    });
  });

  // The chip's attributes are the ONLY ones a span may now carry, and every one
  // of them is inert. A note body is user input that has been through a
  // database; a span that could carry a click handler or a URL would be a way
  // to make one note act on another visit.
  test("a span may still carry nothing that acts", () => {
    const cleaned = sanitizeNoteHtml(
      '<span onclick="steal()" href="http://x" data-media-id="4" contenteditable="true" title="x">א</span>'
    );
    expect(cleaned).toBe('<span data-media-id="4">א</span>');
  });

  test("a chip claiming something that is not a lecture id is not a chip", () => {
    const cleaned = sanitizeNoteHtml('<span data-media-id="javascript:alert(1)">א</span>');
    expect(cleaned).toBe("<span>א</span>");
    expect(sourceFromChip(Object.assign(document.createElement("span"), { innerHTML: "" }))).toBe(null);
  });

  // A title is carried on the chip so the dialog opened from it has the real
  // one, but a note body must not become a place to store arbitrary text.
  test("the carried title is bounded", () => {
    const long = "כ".repeat(400);
    expect(sanitizeNoteHtml(`<span data-media-id="1" data-media-title="${long}">א</span>`))
      .toBe('<span data-media-id="1">א</span>');
    expect(sourceChipHtml({ mediaId: 1, mediaTitle: long })).toContain(`data-media-title="${"כ".repeat(120)}"`);
  });

  // The chip is the sentence's source, so it reads as part of the sentence
  // everywhere the note is shown as words: the list preview, the search index
  // and the PDF export. Both of its lines are text — the break between them is
  // a real <br>, which is exactly why they do not run together into one word.
  test("a chip reads as both its lines in plain text", () => {
    expect(noteHtmlToPlainText(`ראה ${chip}`)).toBe("ראה ▶ בבא קמא ב · 12:22\nבעניין יתרו");
  });

  // What the user actually wrote at that second. A reference saying only
  // "שיעור · 45:12" is an address; this is what is AT the address, and without
  // it a note full of chips says nothing about why any of them are there.
  test("the bookmark's own words are shown on the chip, on their own line", () => {
    expect(chip).toContain('<br><span data-chip-line="note">בעניין יתרו</span>');
    expect(sanitizeNoteHtml(chip)).toContain('data-chip-line="note"');
  });

  test("a long note is cut to its first words on the chip but kept in full on it", () => {
    const long = "בעניין יתרו ומשה רבנו ומה שכתב הרמבם בהלכות דעות פרק ראשון";
    const built = sourceChipHtml({ mediaId: 1, mediaTitle: "שיעור", note: long });

    expect(built).toContain(`data-note="${long}"`);
    expect(noteHtmlToPlainText(built)).toContain("…");
    expect(noteHtmlToPlainText(built)).toContain("בעניין יתרו ומשה רבנו");
  });

  test("a bookmark with no words of its own gets no second line", () => {
    const built = sourceChipHtml({ mediaId: 1, timestampSeconds: 5, mediaTitle: "שיעור" });

    expect(built).not.toContain("data-chip-line");
    expect(built).not.toContain("<br>");
  });

  // The chip carries the accent of the KIND of lecture it came from, so a
  // bookmark dragged out of an orange group does not land as a blue chip.
  test("the media type survives, and only the three that name a colour", () => {
    for (const type of ["video", "audio", "text"]) {
      const built = sourceChipHtml({ mediaId: 1, mediaTitle: "שיעור", mediaType: type });
      expect(sanitizeNoteHtml(built)).toContain(`data-media-type="${type}"`);
    }

    // It is turned straight into a background colour, so anything that does not
    // name one is refused at both ends: never written, never read back.
    expect(sourceChipHtml({ mediaId: 1, mediaTitle: "שיעור", mediaType: "url(x)" }))
      .not.toContain("data-media-type");
    expect(sanitizeNoteHtml('<span data-media-id="1" data-media-type="url(x)">א</span>'))
      .toBe('<span data-media-id="1">א</span>');
  });

  // The chip sits INSIDE a sentence, so its label has to stay about the size of
  // a word or two. A full lecture title made a blue box wider than the editor,
  // and since an inline-block cannot break itself the note ran off the side of
  // its own card. Nothing is lost by shortening: the whole title is still
  // carried on the chip and printed in the export's footnote.
  test("a long lecture name is shortened in the label but kept on the chip", () => {
    const long = "שיעור בעניין ארבעה אבות נזיקין ובדין שור המועד והתם וכל הנלווה";
    const built = sourceChipHtml({ mediaId: 1, timestampSeconds: 60, mediaTitle: long });

    expect(built).toContain(`data-media-title="${long}"`);
    expect(noteHtmlToPlainText(built).length).toBeLessThan(long.length);
    expect(noteHtmlToPlainText(built)).toContain("…");
    // Still recognisable: the shortening takes the tail, not the name.
    expect(noteHtmlToPlainText(built)).toContain("שיעור בעניין ארבעה אבות");
  });

  test("a name short enough to show is not given an ellipsis it does not need", () => {
    expect(noteHtmlToPlainText(chip)).not.toContain("…");
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

// The same agreement, for the other kind of source. A chip pointing into a sefer
// carries a paragraph and a page instead of a second, and both are new — so both
// are exactly the attributes a sanitizer nobody told about would drop. The
// failure is silent and delayed: the chip renders, survives being typed, and
// loses its anchor the first time the note goes through the database.
describe("a source chip pointing at a passage in a book", () => {
  const chip = sourceChipHtml({
    mediaId: 9,
    mediaTitle: "שערי תשובה",
    note: "יסוד הסוגיה",
    mediaType: "text",
    chunkId: 55,
    pageNumber: 47,
  });

  test("the anchor and the citation survive the sanitizer", () => {
    const cleaned = sanitizeNoteHtml(chip);
    expect(cleaned).toContain('data-chunk-id="55"');
    expect(cleaned).toContain('data-page="47"');
    expect(cleaned).toContain('data-media-type="text"');
  });

  test("it round-trips back with the same anchor it was built from", () => {
    const body = document.createElement("div");
    body.innerHTML = noteBodyToHtml(sanitizeNoteHtml(`כתוב כאן ${chip} והמשך`));

    expect(sourceFromChip(body.querySelector(SOURCE_CHIP_SELECTOR))).toEqual({
      mediaId: 9,
      timestampSeconds: null,
      chunkId: 55,
      pageNumber: 47,
      mediaTitle: "שערי תשובה",
      note: "יסוד הסוגיה",
      mediaType: "text",
      noteText: "יסוד הסוגיה",
    });
  });

  // A book has no clock, and formatTime(null) is "0:00" — so a chip that fell
  // back to a timestamp would print "0:00" beside every sefer in the notebook.
  test("it is labelled by page, never by a time it does not have", () => {
    expect(chip).toContain("עמ׳ 47");
    expect(chip).not.toContain("0:00");
  });

  // .txt and .docx have no pages, and neither does a PDF whose boundaries could
  // not be derived. Naming the book and stopping is still a complete reference.
  test("a book with no page number names the book and stops", () => {
    const noPage = sourceChipHtml({ mediaId: 9, mediaTitle: "שערי תשובה", mediaType: "text", chunkId: 55 });
    expect(noPage).toContain("שערי תשובה");
    expect(noPage).not.toContain("data-page");
    expect(noPage).not.toContain("0:00");
  });

  test("a chunk id that is not a number is not carried", () => {
    expect(sanitizeNoteHtml('<span data-media-id="1" data-chunk-id="javascript:1">א</span>'))
      .toBe('<span data-media-id="1">א</span>');
  });
});
