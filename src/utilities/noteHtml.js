// A note's body is a small fragment of HTML — the toolbar in the notebook's
// header writes bold, colours, highlights and lists into it.
//
// notes.body is a plain TEXT column and stays one: HTML is text, and a note is
// the user's own writing shown only back to them. What changes is that the
// column now holds markup, which brings two obligations this file owns.
//
//   1. Notes written BEFORE the toolbar existed are plain text with newlines.
//      They must keep reading the way they were typed, so they are converted on
//      the way into the editor rather than left to collapse into one paragraph.
//   2. Nothing is trusted on the way back out. The markup is the user's own, so
//      this is not a defence against an attacker with a victim — but a note can
//      be pasted into, and a body that has been through a database is input
//      again by the time it is put back on screen. An allowlist is cheap and the
//      alternative is trusting a string because of where it came from.
//
// Both directions live here rather than in the editor so the list preview, the
// search index and the source window get the same answers as the editor does.

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

// Exactly what the toolbar can produce, and nothing else. `span` and `font` are
// how execCommand records a colour; the browser picks between them and is not
// consistent about it, so both are allowed and both are stripped down to a
// colour below.
const ALLOWED_TAGS = new Set([
  "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "MARK",
  "SPAN", "FONT", "BR", "DIV", "P", "UL", "OL", "LI", "IMG",
]);

// Removed with their contents. Everything else that is not allowed is UNWRAPPED
// instead — an unknown tag around the user's sentence should cost the tag, not
// the sentence — but the text inside these is not writing, it is code.
const DROPPED_WITH_CONTENT = new Set([
  "SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "TEMPLATE", "SVG",
]);

// A colour and nothing else. The `rgb(...)` form is spelled out rather than
// allowing any function call, because `url(...)` and the old `expression(...)`
// are function calls too.
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i;

// A length or one of the CSS size keywords. Browsers disagree about which of the
// two they emit for the same "make this bigger" command, so both are accepted.
const SAFE_FONT_SIZE =
  /^(\d+(\.\d+)?(px|pt|em|rem|%)|xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger)$/i;

// The declarations that survive, and what counts as a value for each. Everything
// the toolbar can produce is here and nothing else is: a style attribute is
// otherwise a way to load a URL or to lift an element out of the page.
const ALLOWED_STYLE_PROPERTIES = {
  "color": SAFE_COLOR,
  "background-color": SAFE_COLOR,
  "font-size": SAFE_FONT_SIZE,
};

// Whether a stored body is markup or the plain text of a note written before the
// toolbar existed. Keyed on the tags this file actually allows: a note whose
// text happens to contain "<" — "a < b" — is still plain text, and treating it
// as markup would silently eat the rest of the line.
const looksLikeHtml = (value) =>
  /<\/?(b|strong|i|em|u|s|strike|mark|span|font|br|div|p|ul|ol|li|img)\b[^>]*>/i.test(value);

// The zero-width space RichNoteEditor leaves behind to hold a caret open inside
// a freshly-sized span. It is a caret's scaffolding, never something the user
// typed, so it is not part of the note's words — and a note holding only one of
// these is still an empty note.
// Written as an escape, not as the character: an invisible literal in the source
// is unreadable and unsearchable, and the linter rejects it for that reason.
const CARET_HOLDER = /\u200B/g;

const parseFragment = (html) =>
  new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;

const escapeHtml = (text) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const matches = (pattern, value) => typeof value === "string" && pattern.test(value.trim());

// What <font> may carry. Browsers still reach for this element for a colour or a
// size even with styleWithCSS on, so both of its attributes are accepted — and
// validated exactly as tightly as the style properties above.
const FONT_ATTRIBUTES = { color: SAFE_COLOR, size: /^[1-7]$/ };

// A pasted image lives INSIDE the note as base64 (see RichNoteEditor for why),
// so a data: URL of a real raster format is the only src that is ever written
// here — and therefore the only one accepted.
//
// SVG is deliberately excluded although it is an image: an SVG document can
// carry script and its own external references, so `data:image/svg+xml` is a
// document being passed off as a picture. The formats below cannot execute.
const SAFE_IMAGE_SRC = /^data:image\/(png|jpe?g|gif|webp|bmp);base64,[a-z0-9+/=\s]+$/i;
const IMG_ATTRIBUTES = { src: SAFE_IMAGE_SRC, alt: /^[\s\S]*$/ };

// A source chip: the reference a bookmark leaves behind when it is dragged into
// a note. utilities/noteSource.js builds these and reads them back; this is the
// half that decides they may survive a round-trip through the database, and the
// two are asserted to agree in noteHtml.test.js.
//
// Every value here is inert. data-* attributes do nothing on their own — the
// note card is what gives them meaning, by opening the lecture they name — and
// they are bounded rather than free text so a chip cannot be used to grow a note
// body without limit. `contenteditable` is allowed only as "false", which is the
// value that makes the chip a single object to the caret; "true" is not a thing
// a stored note should be able to ask for.
//
// Note what is NOT here: no href, no src, no event handler. A chip points at a
// lecture id, and an id is not a URL.
const SOURCE_CHIP_ATTRIBUTES = {
  "data-media-id": /^\d{1,10}$/,
  "data-timestamp": /^\d{1,7}$/,
  "data-media-title": /^[\s\S]{0,120}$/,
  // The bookmark's own title, which the chip shows on its second line and the
  // export prints in the footnote. Bounded exactly as the lecture title is.
  "data-note": /^[\s\S]{0,120}$/,
  // What colours the chip. An enumeration and not free text: it is turned
  // straight into a background colour, so the only values worth keeping are the
  // three that name one. Anything else is dropped and the chip stays neutral.
  "data-media-type": /^(video|audio|text)$/,
  // Marks the chip's second line so it can be styled apart from the first.
  "data-chip-line": /^note$/,
  "contenteditable": /^false$/i,
};

// The attributes each tag may carry beyond `style`, which every allowed element
// may have and which is filtered separately below.
const TAG_ATTRIBUTES = { FONT: FONT_ATTRIBUTES, IMG: IMG_ATTRIBUTES, SPAN: SOURCE_CHIP_ATTRIBUTES };

// Everything an allowed element is permitted to carry: a colour, a size, or —
// for an image — its embedded source.
const stripAttributes = (element) => {
  const allowed = TAG_ATTRIBUTES[element.tagName] ?? {};
  for (const { name } of [...element.attributes]) {
    const keep =
      name === "style" ||
      (name in allowed && matches(allowed[name], element.getAttribute(name)));
    if (!keep) element.removeAttribute(name);
  }

  // An <img> whose src did not survive is not a picture, it is a broken-image
  // icon with a caption nobody wrote. Dropped outright rather than left behind.
  if (element.tagName === "IMG" && !element.hasAttribute("src")) {
    element.remove();
    return;
  }

  const style = element.getAttribute("style");
  if (style === null) return;

  const kept = style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => {
      const colon = declaration.indexOf(":");
      if (colon === -1) return false;
      const property = declaration.slice(0, colon).trim().toLowerCase();
      const pattern = ALLOWED_STYLE_PROPERTIES[property];
      return Boolean(pattern) && matches(pattern, declaration.slice(colon + 1));
    });

  if (kept.length > 0) element.setAttribute("style", kept.join("; "));
  else element.removeAttribute("style");
};

// Depth-first, and the order is load-bearing: a child is cleaned BEFORE its
// parent is unwrapped, so an unknown tag cannot smuggle its subtree past the
// allowlist by being lifted into a position that was already walked.
const cleanChildren = (node) => {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === TEXT_NODE) continue;
    if (child.nodeType !== ELEMENT_NODE) { child.remove(); continue; } // comments, CDATA

    if (DROPPED_WITH_CONTENT.has(child.tagName)) { child.remove(); continue; }

    cleanChildren(child);

    if (ALLOWED_TAGS.has(child.tagName)) stripAttributes(child);
    else child.replaceWith(...child.childNodes);
  }
};

export const sanitizeNoteHtml = (html) => {
  if (!html) return "";
  const body = parseFragment(html);
  cleanChildren(body);
  return body.innerHTML;
};

// A stored body, ready for the editor. Plain text from before the toolbar is
// escaped and its newlines become <br> — which is what makes an old note look
// on screen the way it was typed rather than as one run-on paragraph.
export const noteBodyToHtml = (body) => {
  if (!body) return "";
  if (!looksLikeHtml(body)) return escapeHtml(body).replace(/\r?\n/g, "<br>");
  return sanitizeNoteHtml(body);
};

// The words in a fragment that has ALREADY been parsed.
//
// Split out of noteHtmlToPlainText for the export, which parses a body itself
// to swap source chips for footnote marks and then wants the text of what is
// left. Serializing that back to a string and handing it to the function below
// would not merely be wasteful — it would be wrong: a body whose only markup
// was the chip stops looking like HTML the moment the chip is gone, so the
// entities in it would be printed as "&nbsp;" instead of read as spaces.
//
// One implementation, two doors. The alternative was a second copy of these
// three rules, which is how the preview and the export drift apart.
export const fragmentToPlainText = (fragment) => {
  // An image has no words, but it is not nothing either: without a stand-in, a
  // note that is one screenshot reads as an empty note everywhere text is shown
  // — in the list preview, in the search index and in the export.
  for (const image of fragment.querySelectorAll("img")) image.replaceWith("[תמונה]");
  // A line break IS the text here: without this, two lines come back joined
  // into one word and the preview reads as nonsense.
  for (const br of fragment.querySelectorAll("br")) br.replaceWith("\n");
  for (const block of fragment.querySelectorAll("div, p, li")) block.append("\n");

  return fragment.textContent.replace(CARET_HOLDER, "").replace(/\n{3,}/g, "\n\n").trim();
};

// The words with the markup taken off — for the list preview, for searching, and
// for the text the source window is opened with. Those three want a sentence,
// and would otherwise be matching and displaying tag names.
export const noteHtmlToPlainText = (body) => {
  if (!body) return "";
  if (!looksLikeHtml(body)) return body.replace(CARET_HOLDER, "");
  return fragmentToPlainText(parseFragment(body));
};

// A body of "<div><br></div>" is what an emptied editor leaves behind, and it is
// not content: without this the placeholder would never come back once the user
// had typed and deleted.
export const isNoteHtmlEmpty = (body) => noteHtmlToPlainText(body).trim() === "";
