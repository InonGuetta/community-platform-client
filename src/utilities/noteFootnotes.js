import { noteHtmlToPlainText, fragmentToPlainText } from "./noteHtml";
import { SOURCE_CHIP_SELECTOR, sourceFromChip, sourceFootnoteLabel, CHIP_MARKER } from "./noteSource";

// Turning the lectures a note cites into footnotes at the bottom of the page.
//
// In the notebook a source is a chip: a small blue thing you click to reopen the
// lecture at that second. On paper there is nothing to click, and a lecture's
// name in the middle of a sentence interrupts the sentence — so on the way into
// a document each chip becomes a numbered mark, and the lecture it names is
// printed at the foot of the page the mark landed on.
//
// Numbering runs across the WHOLE document rather than restarting per note.
// Two notes citing the same lecture at the same second get one number and one
// footnote, which is what a reader expects of a reference and what stops a
// notebook of forty notes about one shiur from printing the same line forty
// times.
//
// The registry is deliberately separate from both writers. The PDF writer knows
// about pages and can put a footnote on the page its mark fell on; Word knows
// nothing about pages until it lays the document out, and gets its own footnote
// machinery instead. What they share is the numbering, which is this file.

// How a mark reads in the text, and the pattern the PDF writer scans lines with
// to discover which footnotes belong to a page. Square brackets rather than a
// superscript character: this has to survive being measured, line-broken and
// bidi-reordered as ordinary text.
export const footnoteMark = (number) => `[${number}]`;
export const FOOTNOTE_MARK_PATTERN = /\[(\d+)\]/g;

// A source is a lecture AT a moment — the same lecture bookmarked twice is two
// references — which is the same identity the notebook's source trail uses.
const identityOf = (source) => `${source.mediaId}:${source.timestampSeconds ?? ""}`;

/**
 * Collects the sources of a document and hands out their numbers.
 *
 * One per export, shared by every note in it.
 */
export const createSourceRegistry = () => {
  const numbers = new Map();
  const labels = new Map();

  return {
    /** The number for this source, allocating one the first time it is seen. */
    mark(source) {
      const key = identityOf(source);
      if (!numbers.has(key)) {
        numbers.set(key, numbers.size + 1);
        labels.set(numbers.get(key), sourceFootnoteLabel(source));
      }
      return numbers.get(key);
    },

    /** number → the line printed at the foot of the page. */
    labels: () => Object.fromEntries(labels),

    get size() { return numbers.size; },
  };
};

// The chips in a body, in document order, each already registered. Shared by
// both conversions below so they cannot disagree about what counts as a source
// or in what order the numbers are handed out.
const parse = (body) => new DOMParser().parseFromString(`<body>${body}</body>`, "text/html").body;

// Cheap enough to run on every note, and it answers the only question that
// matters before any parsing happens: a body with no chip in it needs none of
// this, and a note written before the toolbar existed is plain text that must
// NOT be parsed as markup — an "a < b" somebody typed would lose the rest of
// its line.
const hasChips = (body) => body.includes("data-media-id");

// The chip carries a trailing non-breaking space so the caret has somewhere to
// land after it while the note is being written. On paper that scaffolding
// would print as a second space after every mark, so it leaves with the chip
// it belonged to.
//
// Matched by code point rather than against a literal, for the reason
// noteHtml.js gives about its caret holder: an invisible character in source is
// unreadable, unsearchable, and indistinguishable from the ordinary space it is
// not.
const NBSP_CODE = 0xA0;

const dropTrailingSpacer = (chip) => {
  const next = chip.nextSibling;
  if (next?.nodeType === 3 && next.data.charCodeAt(0) === NBSP_CODE) next.data = next.data.slice(1);
};

/**
 * The three ways a document can carry its sources, and they answer different
 * questions.
 *
 *   FOOTNOTES — the reference becomes a bare "[1]" and the lecture is printed
 *   at the foot of the page. The sentence stays a sentence; the apparatus keeps
 *   out of the way until it is wanted. This is what a printed text does.
 *
 *   INLINE — the reference keeps everything the card shows: its number, the
 *   lecture, the minute, and the words the user wrote at that second. Longer to
 *   read, but nothing is anywhere else. This is what a study sheet does, and it
 *   is the one to pick when the document is going to be read on a screen or
 *   annotated further rather than printed.
 *
 *   NONE — the references are left out altogether and the document is the
 *   user's own writing and nothing else. Not a lesser version of the other two:
 *   a note written FROM a lecture is often meant to stand without it, and a
 *   page of citations is noise in a document being handed to somebody who
 *   cannot follow them anyway.
 */
export const SOURCE_STYLES = { footnotes: "footnotes", inline: "inline", none: "none" };

// A chip's own content, on one line: "▶ שיעור · 45:12 — בעניין יתרו ומשה רבנו".
//
// The card stacks those two parts, and a line break in the middle of a sentence
// would break the sentence rather than the reference — so on the way into a
// document the break becomes a dash. Everything the card shows is still here,
// in the order it shows it.
//
// The break has to be replaced in the DOM rather than in the string: a <br> is
// an element, and textContent joins the text either side of it with nothing at
// all — which ran the lecture's name straight into the note's first word. The
// chip is copied first because it is still needed intact by anything reading it
// after this.
const inlineSourceText = (chip, number) => {
  const copy = chip.cloneNode(true);
  for (const br of copy.querySelectorAll("br")) br.replaceWith(" — ");

  // The play triangle goes. On screen it says "this is pressable"; on paper
  // there is nothing to press, and the PDF's embedded font has no glyph for it
  // — so a document that kept it printed an empty box in front of every single
  // source. See CHIP_MARKER, and pdfFontCoverage.test.js, which is what catches
  // the next character with the same problem.
  const text = copy.textContent.split(CHIP_MARKER).join("").replace(/\s+/g, " ").trim();
  return `${footnoteMark(number)} ${text}`;
};

// Every chip in a body, cleaned of its editor scaffolding and handed to
// whatever the chosen style wants to do with it. Shared by the two conversions
// so they cannot disagree about what counts as a source, in what order the
// numbers are handed out, or what a chip that names no lecture means.
const eachChip = (fragment, registry, replace) => {
  for (const chip of [...fragment.querySelectorAll(SOURCE_CHIP_SELECTOR)]) {
    const source = sourceFromChip(chip);
    // A chip whose media id did not survive sanitizing is not a reference. Its
    // text is left where it is rather than dropped: it is still something the
    // user typed or dragged, and a silent hole in a sentence is worse than a
    // line that reads oddly.
    if (!source) continue;
    dropTrailingSpacer(chip);
    replace(chip, registry.mark(source));
  }
};

/**
 * A note's body as plain text, with its sources rendered in the chosen style.
 *
 * For the PDF, which draws lines of glyphs and takes text. The replacement
 * happens in the DOM and the existing plain-text conversion runs afterwards, so
 * everything else about how a note becomes text — images, line breaks, the
 * caret scaffolding — keeps exactly one implementation.
 */
export const noteTextWithSources = (body, registry, style = SOURCE_STYLES.footnotes) => {
  if (!body) return "";
  if (!hasChips(body)) return noteHtmlToPlainText(body);

  const fragment = parse(body);

  eachChip(fragment, registry, (chip, number) => {
    if (style === SOURCE_STYLES.none) { chip.remove(); return; }
    chip.replaceWith(style === SOURCE_STYLES.inline
      ? inlineSourceText(chip, number)
      : footnoteMark(number));
  });

  // The already-parsed fragment, NOT its innerHTML handed back to the string
  // version: a body whose only markup was the chip no longer looks like HTML
  // once the chip is gone, and every entity in it would then be printed
  // literally — "&nbsp;" in the middle of a sentence.
  return fragmentToPlainText(fragment);
};

/**
 * A note's body as HTML, with its sources rendered in the chosen style.
 *
 * FOOTNOTES uses Word's own HTML dialect — `mso-element:footnote` and friends —
 * which is what Word emits when it saves a document with footnotes as a web
 * page, and what it reads back to rebuild them. That is the only way to put
 * something at the foot of a PAGE from HTML: HTML has no pages, so the
 * pagination has to be left to the program that does.
 *
 * The number is written out as literal text rather than left to Word's
 * auto-numbering field. Word renumbers either way; the difference is that a
 * reader opening the same file in LibreOffice or Google Docs — neither of which
 * understands the mso attributes — still sees "[1]" against a list of sources
 * at the end, instead of a document with unmarked references.
 *
 * INLINE keeps the chip exactly as the notebook renders it — both of its lines
 * and its media-type colour, which the document's stylesheet carries over — and
 * only writes a number in front of it. "As it appears in the card" is meant
 * literally: the same element, not a copy of its text.
 */
export const noteHtmlWithSources = (body, registry, style = SOURCE_STYLES.footnotes) => {
  if (!body) return "";
  if (!hasChips(body)) return body;

  const fragment = parse(body);

  eachChip(fragment, registry, (chip, number) => {
    if (style === SOURCE_STYLES.none) { chip.remove(); return; }

    if (style === SOURCE_STYLES.inline) {
      chip.insertBefore(document.createTextNode(`${footnoteMark(number)} `), chip.firstChild);
      return;
    }

    const anchor = document.createElement("a");
    anchor.setAttribute("style", "mso-footnote-id:ftn" + number + ";color:#1565c0;text-decoration:none");
    anchor.setAttribute("href", `#_ftn${number}`);
    anchor.setAttribute("name", `_ftnref${number}`);
    anchor.innerHTML = `<span class="MsoFootnoteReference"><sup>${footnoteMark(number)}</sup></span>`;
    chip.replaceWith(anchor);
  });

  return fragment.innerHTML;
};

/**
 * The footnote list Word turns into real footnotes, one entry per source.
 *
 * Appended once at the end of the document body — which is where Word expects
 * it, and where it stays visible as a plain "sources" list in any reader that
 * does not know what to do with it.
 */
export const wordFootnoteList = (registry, style = SOURCE_STYLES.footnotes) => {
  // Inline sources are already the whole reference, in place — repeating them
  // at the end would be the same list twice — and a document exported without
  // sources must not grow a list of them at the bottom.
  if (style !== SOURCE_STYLES.footnotes) return "";

  const entries = Object.entries(registry.labels());
  if (entries.length === 0) return "";

  const rows = entries.map(([number, label]) => `
  <div style='mso-element:footnote' id="ftn${number}">
    <p class="MsoFootnoteText" style="color:#1565c0">
      <a style='mso-footnote-id:ftn${number};color:#1565c0;text-decoration:none' href="#_ftnref${number}" name="_ftn${number}"><span class="MsoFootnoteReference"><sup>${footnoteMark(number)}</sup></span></a>
      ${label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}
    </p>
  </div>`).join("");

  return `<div style='mso-element:footnote-list'>${rows}\n</div>`;
};
