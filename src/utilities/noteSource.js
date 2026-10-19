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

// Where the reference points, in the units its medium has. A recording has a
// minute; a sefer has a page, and had nothing at all before migration 023 made
// the page derivable — in which case the chip names the book and stops, which is
// still a complete reference.
//
// CHIP_MARKER stays the same triangle for both. It says "this opens something",
// which is as true of a book as of a lecture, and a second marker for text would
// have to be taught to noteFootnotes (which strips it before printing) and to
// pdfFontCoverage.test.js (which checks the embedded font has a glyph for it) —
// two files changed so the icon could be marginally more apt.
const chipStamp = ({ timestampSeconds, pageNumber }) => {
  if (Number.isInteger(pageNumber)) return ` · עמ׳ ${pageNumber}`;
  if (timestampSeconds == null) return "";
  return ` · ${formatTime(timestampSeconds)}`;
};

const chipLabel = (source) => {
  const title = shorten(source.mediaTitle || "שיעור", CHIP_LABEL_CHARS);
  return `${CHIP_MARKER} ${title}${chipStamp(source)}`;
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
export const sourceChipHtml = ({
  mediaId, timestampSeconds, mediaTitle, note, mediaType, chunkId, pageNumber, bookmarkId,
}) => {
  const attributes = [
    `data-media-id="${escapeAttribute(mediaId)}"`,
    timestampSeconds == null ? "" : `data-timestamp="${escapeAttribute(Math.floor(timestampSeconds))}"`,
    // Where in a BOOK this points. The chunk is what the reader can scroll to —
    // a character offset alone stops meaning anything the moment the text is
    // re-extracted, which is why migration 026 stores the id and why the chip
    // carries the id rather than the offset.
    //
    // The page is carried too, and is not derivable from the chunk here: the
    // note may be read, exported or printed long after the bookmark it came from
    // was deleted, and this markup is then the only record of the citation.
    Number.isInteger(chunkId) ? `data-chunk-id="${escapeAttribute(chunkId)}"` : "",
    Number.isInteger(pageNumber) ? `data-page="${escapeAttribute(pageNumber)}"` : "",
    // The bookmark this chip IS, when it came from one. Its name is then the
    // bookmark's, not this markup's — see syncChipNames below.
    Number.isInteger(bookmarkId) ? `data-bookmark-id="${escapeAttribute(bookmarkId)}"` : "",
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

  return `<span ${attributes}>${escapeText(chipLabel({ mediaTitle, timestampSeconds, pageNumber }))}${noteLine}</span>&nbsp;`;
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
  const chunk = chip.getAttribute("data-chunk-id");
  const page = chip.getAttribute("data-page");
  const bookmark = chip.getAttribute("data-bookmark-id");
  const note = chip.getAttribute("data-note") || "";
  return {
    mediaId,
    bookmarkId: bookmark === null ? null : Number(bookmark),
    timestampSeconds: stamp === null ? null : Number(stamp),
    // Null rather than undefined for both, so a chip written before books were
    // bookmarkable reads the same as one pointing at a recording — absent, not
    // missing. The source window branches on chunkId being an integer.
    chunkId: chunk === null ? null : Number(chunk),
    pageNumber: page === null ? null : Number(page),
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
export const sourceFootnoteLabel = ({ mediaTitle, note, timestampSeconds, pageNumber }) => [
  String(mediaTitle || "").trim() || "שיעור",
  String(note || "").trim(),
  // The page when there is one, and never a minute alongside it. "עמ׳ 47" is how
  // a person cites a sefer and how they would go and find the passage again;
  // a timestamp on a book would be 0:00 for every reference in the document.
  Number.isInteger(pageNumber) ? `עמ׳ ${pageNumber}` : (timestampSeconds == null ? "" : formatTime(timestampSeconds)),
].filter(Boolean).join(" · ");

/**
 * The chip for a bookmark row, in the shape the notebook's sidebar holds them
 * (snake_case, straight off the API). Kept here so the sidebar does not have to
 * know what a chip is made of — it only has to say which bookmark was dragged.
 */
export const bookmarkDragPayload = (bookmark, mediaTitle) => ({
  mediaId: bookmark.media_id,
  // So the chip dropped into a note is that bookmark, not a copy of it:
  // renamed in either place, it is renamed in both.
  bookmarkId: Number.isInteger(bookmark.id) ? bookmark.id : null,
  timestampSeconds: bookmark.timestamp_seconds,
  // The book half of the anchor. Both are carried for every bookmark and one of
  // the two is always null, which is the same shape the row itself has — a
  // payload that dropped the null half would make a text bookmark arrive looking
  // like a recording with no timestamp.
  chunkId: bookmark.chunk_id ?? null,
  pageNumber: bookmark.page_number ?? null,
  mediaTitle: mediaTitle || bookmark.media_title || "",
  note: bookmark.note || "",
  // Which of video / audio / text this came from, so the chip carries the same
  // accent the archive card and the sidebar's own group header use. A source
  // that is a different colour in the note than in the list it was dragged from
  // is two things to the reader, not one.
  mediaType: bookmark.media_type || null,
});

/**
 * Whether a note belongs to one lesson, for the notebook strip on that lesson's
 * own page.
 *
 * Two ways in, and both count. A note TAKEN on the lesson carries its id in
 * `media_id`. A note written anywhere else that QUOTES it carries a source chip
 * in its body — the same `data-media-id` attribute sourceChipHtml writes above.
 * A notebook that showed only the first would hide exactly the notes where the
 * user connected this shiur to something else, which are the ones worth seeing
 * next to it.
 *
 * Matched on the attribute as written rather than by parsing the body: this
 * runs over every note on every render of the page, and the attribute is
 * produced in one place — this file — so its shape is known. The closing quote
 * is what stops lesson 4 from matching a chip for lesson 49.
 */
export const isNoteAboutMedia = (note, mediaId) => {
  const id = Number(mediaId);
  if (!Number.isInteger(id) || id <= 0 || !note) return false;
  if (Number(note.media_id) === id) return true;
  return typeof note.body === "string" && note.body.includes(`data-media-id="${id}"`);
};

// The name a reference gets when the user has not given it one: a note started
// from a lesson's page is about the lesson in general until they say what part.
export const GENERAL_REFERENCE_LABEL = "הפנייה כללית";

/**
 * Rename a chip already in a note body, in place.
 *
 * The name is the chip's second line — the same `data-note` a bookmark's text
 * travels in when it is dragged in — so a renamed chip opens, exports and
 * footnotes exactly as one that arrived with that name. Both halves are kept in
 * step: the attribute holds the full name (capped as sourceChipHtml caps it),
 * and the visible line the shortened one.
 *
 * An empty name removes the line rather than leaving an empty one behind, which
 * is the chip a bookmark with no note produces.
 *
 * Returns whether it was a chip at all, so a caller can tell a rename from a
 * click that landed on nothing.
 */
export const renameSourceChip = (chip, name) => {
  if (!chip?.matches?.(SOURCE_CHIP_SELECTOR)) return false;
  const clean = String(name ?? "").trim().slice(0, MAX_CHIP_NOTE);
  let line = chip.querySelector('span[data-chip-line="note"]');

  if (!clean) {
    chip.removeAttribute("data-note");
    if (line?.previousSibling?.nodeName === "BR") line.previousSibling.remove();
    line?.remove();
    return true;
  }

  chip.setAttribute("data-note", clean);
  if (!line) {
    const doc = chip.ownerDocument;
    line = doc.createElement("span");
    line.setAttribute("data-chip-line", "note");
    chip.append(doc.createElement("br"), line);
  }
  line.textContent = shorten(clean, CHIP_NOTE_CHARS);
  return true;
};

// ── The references line at the foot of a note ───────────────────────────────
//
// A chip dropped on blank space — an empty note, an empty line, the space under
// the last paragraph — goes to the END of the note rather than wherever the
// pointer happened to be, and every such chip collects on one line there. The
// editor pins that line to the bottom of its box (RichNoteEditor's sx), so in a
// note that has not been written yet the reference sits where a footnote would,
// with the page above it left to write on.
//
// A chip dropped ONTO a line of text still lands in the sentence — that is a
// citation of something in particular, and moving it would break the sentence
// it was aimed at.
//
// The line is a <p data-references="true">. The attribute is the only thing
// that marks it, so noteHtml's sanitizer has to let it through on a P.
export const REFERENCES_SELECTOR = 'p[data-references]';

export const referencesBlockHtml = (chipsHtml) => `<p data-references="true">${chipsHtml}</p>`;

// The writing in a node, ignoring the chips inside it: a line that holds only
// references is not a line of text to cite into.
export const hasWrittenText = (node) => {
  if (!node) return false;
  const doc = node.ownerDocument;
  const walker = doc.createTreeWalker(node, 4 /* NodeFilter.SHOW_TEXT */);
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (text.parentElement?.closest?.(SOURCE_CHIP_SELECTOR)) continue;
    if (text.textContent.replace(/[\s\u200B\u00A0]/g, "")) return true;
  }
  return false;
};

const BLOCK_TAGS = new Set(["P", "DIV", "UL", "OL", "LI"]);

/**
 * Append a chip to the note's references line, creating the line if the note
 * has none. Works on the editor's live element; the caller emits the change.
 *
 * Two things are tidied on the way, both so the pinned line has something
 * sensible above it:
 *
 *   * an EMPTY note gets an empty paragraph to write in first, or the only line
 *     in the box would be the references and there would be nowhere to type;
 *   * loose inline content at the root — what a note written before the
 *     toolbar is made of, text and <br>s — is wrapped in a <div>. The pinning
 *     is a flex column, and a bare <br> in a flex container stops breaking the
 *     line, which would run every sentence of an old note together.
 *
 * Returns the paragraph the user should be writing in when the note was empty,
 * so the caret can be put there; null otherwise.
 */
export const appendToReferences = (editor, chipHtml) => {
  const doc = editor.ownerDocument;
  let block = editor.querySelector(`:scope > ${REFERENCES_SELECTOR}`);
  if (block) {
    block.insertAdjacentHTML("beforeend", chipHtml);
    return null;
  }

  let writeHere = null;
  if (!hasWrittenText(editor) && !editor.querySelector("img")) {
    // Chips left loose in an otherwise empty note move into the new line too.
    const loose = [...editor.querySelectorAll(SOURCE_CHIP_SELECTOR)];
    editor.innerHTML = "";
    writeHere = doc.createElement("p");
    writeHere.appendChild(doc.createElement("br"));
    editor.appendChild(writeHere);
    block = doc.createElement("p");
    block.setAttribute("data-references", "true");
    for (const chip of loose) block.append(chip, "\u00A0");
  } else {
    let run = null;
    for (const child of [...editor.childNodes]) {
      const isBlock = child.nodeType === 1 && BLOCK_TAGS.has(child.tagName);
      if (isBlock) { run = null; continue; }
      if (!run) {
        run = doc.createElement("div");
        editor.insertBefore(run, child);
      }
      run.appendChild(child);
    }
    block = doc.createElement("p");
    block.setAttribute("data-references", "true");
  }
  block.insertAdjacentHTML("beforeend", chipHtml);
  editor.appendChild(block);
  return writeHere;
};

// ── A chip that IS a bookmark ───────────────────────────────────────────────
//
// A chip made from a bookmark carries that bookmark's id, and its name is the
// bookmark's note — one value, not a copy of it taken at the moment the chip
// was written. Rename the bookmark under "הערות אישיות" and every chip pointing
// at it says the new name; rename the chip with its pencil and it is the
// bookmark that is renamed (RichNoteEditor's onRenameSource).
//
// The note body still stores a name in `data-note`, and has to: a note is
// exported, printed and read long after a bookmark may have been deleted, and
// that markup is then the only record of what the reference was called. So the
// stored name is the fallback, and the live one wins wherever it is known —
// which is what this does, at the moment a note is shown or exported.

/** id → name, from a list of bookmark rows. A bookmark with no note names nothing. */
export const bookmarkNames = (bookmarks = []) =>
  new Map(
    bookmarks
      .filter((b) => Number.isInteger(b?.id))
      .map((b) => [b.id, String(b.note ?? "").trim()])
  );

/**
 * The same markup, with every chip that is a known bookmark carrying that
 * bookmark's current name. A chip whose bookmark is not in `names` (deleted, or
 * belonging to a lesson this screen did not load) keeps the name it was saved
 * with. The input is returned untouched when nothing differs, so a caller can
 * compare strings to tell whether anything changed.
 */
export const syncChipNames = (html, names) => {
  if (!html || !names?.size || !html.includes("data-bookmark-id")) return html;
  const body = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;
  let changed = false;
  for (const chip of body.querySelectorAll(`${SOURCE_CHIP_SELECTOR}[data-bookmark-id]`)) {
    const id = Number(chip.getAttribute("data-bookmark-id"));
    if (!names.has(id)) continue;
    const name = names.get(id);
    if ((chip.getAttribute("data-note") || "") === name.slice(0, MAX_CHIP_NOTE)) continue;
    renameSourceChip(chip, name);
    changed = true;
  }
  return changed ? body.innerHTML : html;
};
