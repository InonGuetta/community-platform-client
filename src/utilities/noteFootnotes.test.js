// @vitest-environment jsdom
// Parses note bodies with DOMParser, like noteHtml.js next to it.
import { test, expect, describe } from "vitest";
import {
  createSourceRegistry,
  noteTextWithSources,
  noteHtmlWithSources,
  wordFootnoteList,
  footnoteMark,
  SOURCE_STYLES,
} from "./noteFootnotes";
import { sourceChipHtml } from "./noteSource";

// The default everywhere, so the tests that are not about the choice say so
// once here rather than passing it on every line.
const noteTextWithFootnotes = (body, registry) => noteTextWithSources(body, registry, SOURCE_STYLES.footnotes);
const noteHtmlWithFootnoteRefs = (body, registry) => noteHtmlWithSources(body, registry, SOURCE_STYLES.footnotes);

// In the notebook a source is something you click. On paper there is nothing to
// click, and a lecture's name in the middle of a sentence interrupts the
// sentence — so it becomes a numbered mark, and the lecture is printed at the
// foot of the page the mark landed on.

const chip = (over = {}) => sourceChipHtml({
  mediaId: 12,
  timestampSeconds: 742,
  mediaTitle: "בבא קמא ב",
  note: "בעניין יתרו",
  ...over,
});

describe("numbering the sources of a document", () => {
  test("a source becomes a mark, and its lecture becomes the footnote", () => {
    const registry = createSourceRegistry();

    const text = noteTextWithFootnotes(`ראה ${chip()} ושם`, registry);

    expect(text).toBe("ראה [1] ושם");
    // The lecture, then the point inside it, then the minute — everything
    // needed to find it again, in the order a reader would look.
    expect(registry.labels()).toEqual({ 1: "בבא קמא ב · בעניין יתרו · 12:22" });
  });

  // The whole reason the registry is passed in rather than made per note: a
  // notebook of forty notes about one shiur would otherwise print the same
  // footnote forty times, numbered 1 to 40.
  test("the same lecture at the same second is one number in the whole document", () => {
    const registry = createSourceRegistry();

    const first = noteTextWithFootnotes(`אחת ${chip()}`, registry);
    const second = noteTextWithFootnotes(`שתיים ${chip()}`, registry);

    expect(first).toBe("אחת [1]");
    expect(second).toBe("שתיים [1]");
    expect(registry.size).toBe(1);
  });

  // A source is a lecture AT A MOMENT — the same identity the notebook's source
  // window uses. Two bookmarks in one shiur are two references.
  test("the same lecture at a different second is a different source", () => {
    const registry = createSourceRegistry();

    const text = noteTextWithFootnotes(`${chip()} ואחר כך ${chip({ timestampSeconds: 900, note: "המשך" })}`, registry);

    expect(text).toBe("[1] ואחר כך [2]");
    expect(registry.labels()).toEqual({
      1: "בבא קמא ב · בעניין יתרו · 12:22",
      2: "בבא קמא ב · המשך · 15:00",
    });
  });

  test("numbering follows the order the notes are exported in", () => {
    const registry = createSourceRegistry();

    noteTextWithFootnotes(`${chip({ mediaId: 5, mediaTitle: "ראשון" })}`, registry);
    noteTextWithFootnotes(`${chip({ mediaId: 9, mediaTitle: "שני" })}`, registry);

    expect(registry.labels()[1]).toContain("ראשון");
    expect(registry.labels()[2]).toContain("שני");
  });

  // A chip whose media id did not survive sanitizing is not a reference — but
  // it is still something the user dragged in, and a silent hole in a sentence
  // is worse than a line that reads oddly.
  test("a chip that names no lecture is left as text rather than numbered", () => {
    const registry = createSourceRegistry();

    const text = noteTextWithFootnotes('לפני <span data-media-id="">שבור</span> אחרי', registry);

    expect(registry.size).toBe(0);
    expect(text).toContain("שבור");
  });

  test("a note with no sources at all is unchanged", () => {
    const registry = createSourceRegistry();

    expect(noteTextWithFootnotes("<div>סתם הערה</div>", registry)).toBe("סתם הערה");
    expect(registry.labels()).toEqual({});
  });

  // The plain-text conversion still has to do everything else it did — this
  // runs on top of it rather than replacing it.
  test("the rest of the note still becomes text the same way", () => {
    const registry = createSourceRegistry();

    const text = noteTextWithFootnotes(`<div>שורה</div><div>שנייה ${chip()}</div>`, registry);

    expect(text).toBe("שורה\nשנייה [1]");
  });
});

// The other way to carry a source: not at the foot of the page but where it
// stands, with everything the card shows. A study sheet rather than a printed
// text — and the one to pick when the document will be read on a screen.
describe("sources kept inline", () => {
  const inlineText = (body, registry) => noteTextWithSources(body, registry, SOURCE_STYLES.inline);

  test("a source keeps its number, its lecture, its minute and its own words", () => {
    const registry = createSourceRegistry();

    const text = inlineText(`ראה ${chip()} ושם`, registry);

    // Everything the chip shows, in the order it shows it — the card stacks the
    // two parts, and a line break mid-sentence would break the sentence.
    //
    // Everything except the play triangle, which the PDF's font cannot draw and
    // which means nothing on paper anyway. See pdfFontCoverage.test.js.
    expect(text).toBe("ראה [1] בבא קמא ב · 12:22 — בעניין יתרו ושם");
    expect(text).not.toContain("▶");
  });

  // Nothing is at the foot of the page in this mode, so nothing may be
  // collected for it either — a page footer repeating what is already in the
  // paragraph above it is the same list twice.
  test("nothing is left for the foot of the page", () => {
    const registry = createSourceRegistry();

    inlineText(chip(), registry);

    expect(wordFootnoteList(registry, SOURCE_STYLES.inline)).toBe("");
  });

  test("the numbering is the same numbering, so a repeat is still one source", () => {
    const registry = createSourceRegistry();

    expect(inlineText(`${chip()} ושוב ${chip()}`, registry)).toContain("[1]");
    expect(registry.size).toBe(1);
  });

  // "As it appears in the card" is meant literally in Word: the same element,
  // with its media-type colour and its second line, not a copy of its text.
  test("Word keeps the chip itself and only writes a number in front of it", () => {
    const registry = createSourceRegistry();

    const html = noteHtmlWithSources(chip({ mediaType: "video" }), registry, SOURCE_STYLES.inline);

    expect(html).toContain('data-media-type="video"');
    expect(html).toContain('data-chip-line="note"');
    expect(html).toContain(footnoteMark(1));
    // And none of the footnote machinery, which belongs to the other mode.
    expect(html).not.toContain("mso-footnote-id");
  });
});

describe("the Word document's footnotes", () => {
  test("a chip becomes a numbered reference tied to an entry", () => {
    const registry = createSourceRegistry();

    const html = noteHtmlWithFootnoteRefs(`ראה ${chip()}`, registry);
    const list = wordFootnoteList(registry);

    // The reference and the entry are two halves of one link, and Word rebuilds
    // a real footnote out of the pair — which is the only way to reach the foot
    // of a PAGE from HTML, since HTML has no pages.
    expect(html).toContain("mso-footnote-id:ftn1");
    expect(html).toContain('href="#_ftn1"');
    expect(list).toContain("mso-element:footnote-list");
    expect(list).toContain('id="ftn1"');
    expect(list).toContain("בבא קמא ב · בעניין יתרו · 12:22");

    // The chip itself is gone: on paper it is the footnote.
    expect(html).not.toContain("data-media-id");
  });

  // Neither LibreOffice nor Google Docs understands the mso attributes. Written
  // as literal text, the number survives into both as an ordinary "[1]" against
  // a list of sources, rather than leaving a document of unmarked references.
  test("the number is real text, not a field only Word can read", () => {
    const registry = createSourceRegistry();

    const html = noteHtmlWithFootnoteRefs(chip(), registry);

    expect(html).toContain(footnoteMark(1));
    expect(wordFootnoteList(registry)).toContain(footnoteMark(1));
  });

  test("a document with no sources gets no footnote list", () => {
    expect(wordFootnoteList(createSourceRegistry())).toBe("");
  });

  // The list is written into a document, so a lecture title carrying markup
  // characters must not be able to close a tag.
  test("a lecture title cannot break out of the entry it is printed in", () => {
    const registry = createSourceRegistry();
    noteHtmlWithFootnoteRefs(chip({ mediaTitle: "<script>x</script>" }), registry);

    expect(wordFootnoteList(registry)).not.toContain("<script>");
    expect(wordFootnoteList(registry)).toContain("&lt;script&gt;");
  });
});

// Two passages marked in one sefer are two references. They share a media id and
// both have a null timestamp, so before the chunk joined the key they collapsed
// into one numbered footnote — labelled by whichever was cited first, and
// pointing every citation in the document at that one passage.
describe("two passages in the same book", () => {
  test("are numbered separately", () => {
    const registry = createSourceRegistry();
    const first = registry.mark({ mediaId: 9, timestampSeconds: null, chunkId: 55, mediaTitle: "שערי תשובה", pageNumber: 47 });
    const second = registry.mark({ mediaId: 9, timestampSeconds: null, chunkId: 61, mediaTitle: "שערי תשובה", pageNumber: 52 });

    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(registry.labels()[1]).toContain("עמ׳ 47");
    expect(registry.labels()[2]).toContain("עמ׳ 52");
  });

  test("but the same passage cited twice is still one reference", () => {
    const registry = createSourceRegistry();
    const source = { mediaId: 9, timestampSeconds: null, chunkId: 55, mediaTitle: "שערי תשובה", pageNumber: 47 };
    expect(registry.mark(source)).toBe(1);
    expect(registry.mark({ ...source })).toBe(1);
  });

  // The same collapse, one anchor kind later. A mark made on a page of the
  // original scan has no timestamp AND no chunk, so two of them in one sefer
  // matched on every field the key knew about.
  test("two places marked on the pages of the original are numbered separately", () => {
    const registry = createSourceRegistry();
    const onPage = (pageNumber) => ({
      mediaId: 9, timestampSeconds: null, chunkId: null, mediaTitle: "שערי תשובה", pageNumber,
    });

    expect(registry.mark(onPage(9))).toBe(1);
    expect(registry.mark(onPage(41))).toBe(2);
    expect(registry.mark(onPage(9))).toBe(1);

    expect(registry.labels()[1]).toContain("עמ׳ 9");
    expect(registry.labels()[2]).toContain("עמ׳ 41");
  });
});
