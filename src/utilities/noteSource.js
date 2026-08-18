import { formatTime } from "./formatTime";

// A bookmark dragged out of the sidebar and dropped into a note becomes a
// SOURCE CHIP: a small inline reference, inside the note's own body, that opens
// the lecture at that second when clicked.
//
// This file owns the markup and nothing else does — the editor builds chips
// with it, the card reads them back with it, and noteHtml.js is what decides the
// markup is allowed to survive a round-trip through the database. Those two are
// a pair (a chip the sanitizer strips is a chip that vanishes on reload), which
// is why noteHtml.test.js asserts a chip built here passes the sanitizer there
// rather than leaving the agreement to a comment.
//
// Why a <span> carrying data attributes rather than an <a href>:
//
//   * The target is not a URL. It is "this lecture, at this second, in a dialog
//     over the notebook the user is writing in" — navigating away would unmount
//     the page and take any unsaved draft with it.
//   * A note body is user input that has been through a database, and an href
//     is the one attribute in this fragment that could point anywhere. There is
//     no href to validate if there is no href.
//
// contenteditable="false" makes the chip a single object: the caret steps over
// it rather than into it, and Backspace removes the whole reference rather than
// eating it one letter at a time and leaving "▶ שיעור בראש" behind.

// The drag payload's type. A private MIME rather than "text/plain" on purpose:
// text/plain is what a contentEditable accepts natively, so a bookmark dropped
// slightly off-target would insert its own JSON into the note as text. A type
// the browser has no default handling for cannot do that — a drop we do not
// handle simply does nothing.
export const BOOKMARK_DRAG_MIME = "application/x-community-bookmark";

// What a chip looks like to a querySelector — used to find the one under a
// click, and by the sanitizer's tests.
export const SOURCE_CHIP_SELECTOR = "span[data-media-id]";

const escapeText = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Attribute values additionally lose the quote that would end the attribute.
const escapeAttribute = (value) => escapeText(value).replace(/"/g, "&quot;");

// The lecture title is carried on the chip as well as shown in it, because the
// two are not the same string: the visible label is trimmed to stay inline,
// while the dialog opened from the chip wants the real title for its header.
// Capped to keep a note's markup from growing without limit — the sanitizer
// enforces the same bound on the way back in.
export const MAX_CHIP_TITLE = 120;

// The bookmark's OWN title — "בעניין יתרו ומשה רבנו" — as distinct from the
// lecture it sits in. It is what the user actually wrote at that second, so it
// is both carried in full for the export's footnote and SHOWN on the chip's
// second line: a reference reading "שיעור · 45:12" says which recording, and
// only this says which idea.
export const MAX_CHIP_NOTE = 120;

// How much of it fits on the chip. A note's own title is a phrase, not a
// sentence, but it is the user's text and some of them are long — so the first
// few words are shown and the rest is a click away, in the dialog the chip
// opens.
const CHIP_NOTE_CHARS = 40;

// How much of the lecture's name the chip SHOWS. It sits inside a sentence, so
// it has to stay about the size of a word or two — sixty characters was a chip
// wider than the editor, which is a paragraph with a blue box in it rather than
// a reference.
//
// Nothing is lost by shortening: the full title is carried on the chip's own
// data attribute, printed in the export's footnote, and shown in the dialog the
// chip opens. This is the label, not the record. The editor's CSS caps the
// width as well — the two are belt and braces, because a note written before
// this line existed still has the longer label baked into it.
const CHIP_LABEL_CHARS = 32;

const shorten = (value, limit) => {
  const full = String(value ?? "").trim();
  return full.length > limit ? `${full.slice(0, limit).trim()}…` : full;
};

// The little play triangle that opens a chip. It says "this is something you
// can press", which is true on screen and meaningless on paper — and the PDF's
// embedded font, Noto Sans Hebrew, has no glyph for it at all, so a document
// that kept it would print an empty box in front of every source. Exported as
// its own constant so the one place that has to strip it can name it rather
// than repeat the character.
export const CHIP_MARKER = "▶";

const chipLabel = (mediaTitle, timestampSeconds) => {
  const title = shorten(mediaTitle || "שיעור", CHIP_LABEL_CHARS);
  const stamp = timestampSeconds == null ? "" : ` · ${formatTime(timestampSeconds)}`;
  return `${CHIP_MARKER} ${title}${stamp}`;
};

// The media types this chip knows how to colour, and the one attribute that
// says which. Kept to the three the archive has: an unknown value is refused by
// the sanitizer, which leaves the chip its neutral colour rather than an
// unstyled one.
const MEDIA_TYPES = new Set(["video", "audio", "text"]);

/**
 * The markup for one source chip, ready to be inserted into a note body.
 *
 * Two lines, and the second is the point: the first says which recording and
 * at what minute, the second says what the user themselves wrote there. A
 * reference to "שיעור · 45:12" is a place; a reference to "בעניין יתרו ומשה
 * רבנו" is a thought, and the notebook is made of thoughts.
 *
 * The break between them is a <br> rather than a flex column, because the
 * markup has to survive being read back as TEXT — for the list preview, the
 * search index and the export — and a <br> already means "line break" to every
 * one of those. Two stacked flex items would have run together into one word.
 *
 * A trailing space is part of it deliberately: without one the caret lands
 * inside the chip's own text node after an insert, and the next thing the user
 * types is swallowed by a reference that is supposed to be atomic.
 */
export const sourceChipHtml = ({ mediaId, timestampSeconds, mediaTitle, note, mediaType }) => {
  const attributes = [
    `data-media-id="${escapeAttribute(mediaId)}"`,
    timestampSeconds == null ? "" : `data-timestamp="${escapeAttribute(Math.floor(timestampSeconds))}"`,
    `data-media-title="${escapeAttribute(String(mediaTitle || "").slice(0, MAX_CHIP_TITLE))}"`,
    note ? `data-note="${escapeAttribute(String(note).slice(0, MAX_CHIP_NOTE))}"` : "",
    // What colours it. A chip written before this attribute existed simply has
    // no type and keeps the neutral blue, which is why the styling treats the
    // absence as a case rather than as an error.
    MEDIA_TYPES.has(mediaType) ? `data-media-type="${mediaType}"` : "",
    `contenteditable="false"`,
  ].filter(Boolean).join(" ");

  const noteLine = note
    ? `<br><span data-chip-line="note">${escapeText(shorten(note, CHIP_NOTE_CHARS))}</span>`
    : "";

  return `<span ${attributes}>${escapeText(chipLabel(mediaTitle, timestampSeconds))}${noteLine}</span>&nbsp;`;
};

/**
 * Read a chip back out of the DOM, in the shape the source dialog is opened
 * with. Returns null for an element that is not a chip, or whose media id did
 * not survive sanitizing — a reference to nothing is not a reference.
 */
export const sourceFromChip = (element) => {
  const chip = element?.closest?.(SOURCE_CHIP_SELECTOR);
  if (!chip) return null;

  const mediaId = Number(chip.getAttribute("data-media-id"));
  if (!Number.isInteger(mediaId) || mediaId <= 0) return null;

  const stamp = chip.getAttribute("data-timestamp");
  const note = chip.getAttribute("data-note") || "";
  return {
    mediaId,
    timestampSeconds: stamp === null ? null : Number(stamp),
    mediaTitle: chip.getAttribute("data-media-title") || chip.textContent.trim(),
    note,
    mediaType: chip.getAttribute("data-media-type") || null,
    // The line the source window prints in its header. The bookmark's own words
    // when there are any — that is what the user wrote about this moment — and
    // the chip's label only as a fallback, for a chip made before notes were
    // carried. Never the chip's raw textContent, which is now two lines and
    // would arrive with a newline in the middle of a heading.
    noteText: note || chip.textContent.trim().split("\n")[0],
  };
};

/**
 * How a source reads in an export's footnote: the lecture, then the point
 * inside it, then the minute. Everything the reader needs to find it again, in
 * the order they would look for it — and it is one line, because a footnote
 * that wraps three times stops being a footnote.
 *
 * Built from the same fields the chip carries, so a note exported today says
 * exactly what it said when it was written.
 */
export const sourceFootnoteLabel = ({ mediaTitle, note, timestampSeconds }) => [
  String(mediaTitle || "").trim() || "שיעור",
  String(note || "").trim(),
  timestampSeconds == null ? "" : formatTime(timestampSeconds),
].filter(Boolean).join(" · ");

/**
 * The chip for a bookmark row, in the shape the notebook's sidebar holds them
 * (snake_case, straight off the API). Kept here so the sidebar does not have to
 * know what a chip is made of — it only has to say which bookmark was dragged.
 */
export const bookmarkDragPayload = (bookmark, mediaTitle) => ({
  mediaId: bookmark.media_id,
  timestampSeconds: bookmark.timestamp_seconds,
  mediaTitle: mediaTitle || bookmark.media_title || "",
  note: bookmark.note || "",
  // Which of video / audio / text this came from, so the chip carries the same
  // accent the archive card and the sidebar's own group header use. A source
  // that is a different colour in the note than in the list it was dragged from
  // is two things to the reader, not one.
  mediaType: bookmark.media_type || null,
});
