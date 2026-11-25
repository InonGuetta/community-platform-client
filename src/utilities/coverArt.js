// The generated cover of an item that has no uploaded picture (Redesign v4,
// component 5 — `CoverArt`). Pure data: the 15 palettes and the shapes are the
// mockup's own `P` and `art()` (design/redesign-v4/02-archive), and
// features/MediaTile/CoverArt.jsx draws them.
//
// Each palette is [gradient start, gradient end, foreground] — the start at the
// top-end corner of the square, the end at the bottom-start, the shapes in the
// foreground colour.
export const PALETTES = {
  indigo: ["#4f46e5", "#1e1b6b", "#fff"],
  indigo2: ["#6366f1", "#312e81", "#fff"],
  ink: ["#2a2a2e", "#0d0d10", "#f5f5f7"],
  sand: ["#efe4d0", "#d9c6a3", "#2b2418"],
  sand2: ["#f1e7d8", "#d8c3a0", "#2b2418"],
  forest: ["#1f5a46", "#0d2e24", "#e8f5ee"],
  sky: ["#8cc8f0", "#3b82c4", "#06263f"],
  plum: ["#7a2e6b", "#33102d", "#fbe9f7"],
  rust: ["#c2552b", "#6b240d", "#fff1e8"],
  night: ["#1b1f4b", "#07081c", "#fff"],
  sage: ["#c5d3bd", "#8fa684", "#1c2a17"],
  rose: ["#f3a6b5", "#d35d78", "#3d0b1a"],
  navy: ["#1e3a6e", "#0a1630", "#e8efff"],
  teal: ["#2aa6a0", "#0e5b66", "#eafffd"],
  amber: ["#f6b84a", "#d67a14", "#3a1d00"],
};

export const PALETTE_KEYS = Object.keys(PALETTES);

// A small string hash (FNV-1a, 32 bit). Deterministic across sessions and
// browsers, so an item keeps its colour wherever and whenever it is shown —
// which is the whole point of hashing the id rather than picking by position.
const hash = (text) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** The palette an item is drawn in, chosen by its id (D-19). */
export const paletteKeyFor = (id) => PALETTE_KEYS[hash(String(id ?? "")) % PALETTE_KEYS.length];

/** [start, end, foreground] for an item. */
export const paletteFor = (id) => PALETTES[paletteKeyFor(id)];

// The shape by media type: a sound wave, a book, a screen. A type the client
// does not know yet is drawn as a book (D-19) rather than not at all.
const KINDS = { audio: "audio", text: "book", video: "video" };
export const coverKindFor = (mediaType) => KINDS[mediaType] || "book";

// The sound wave: five rings around a point off the start edge, and seven bars.
export const AUDIO_RINGS = [1, 2, 3, 4, 5].map((n) => ({ r: n * 26, opacity: Number((0.34 - n * 0.05).toFixed(2)) }));
export const AUDIO_BARS = [26, 48, 70, 40, 58, 30, 16].map((h, j) => ({ x: 52 + j * 13, y: 100 - h / 2, h }));
