export const roles = { student: "student", lecturer: "lecturer", admin: "admin" };
export const statuses = { idle: "idle", loading: "loading", succeeded: "succeeded", failed: "failed" };
export const mediaTypes = { video: "video", audio: "audio", text: "text" };
export const sessionTypes = { oneOnOne: "1on1", group: "group", webinar: "webinar" };

// Hebrew display labels, keyed by the raw stored value (media_type / role /
// session_type). Display-only — nothing persists or filters by these labels, so
// the single source of truth here can't drift across components.
export const mediaTypeLabels = { video: "וידאו", audio: "אודיו", text: "טקסט" };

// The accent each media type is identified by across the app — the archive
// card's corner brackets and type chip, and the notebook's bookmark headers.
// Fixed hex rather than palette keys so the colour is identical in light and
// dark mode, and shared from here so the two screens cannot drift apart.
export const mediaTypeAccents = { video: "#ef6c00", audio: "#1976d2", text: "#2e7d32" };

// The neutral "row" background used by the notebook's lists and the media
// page's bookmark list.
//
// These replace hard-coded grey.50 / grey.100. MUI's grey scale does NOT invert
// between modes — grey.50 is the same near-white in dark mode as in light — so
// those rows kept a pale background while the theme switched the text to white,
// and the content became white-on-white: present in the DOM, invisible on
// screen. action.hover/selected are palette-derived and flip with the mode,
// which is the property that was actually wanted all along.
export const listRowSx = {
  bgcolor: "action.hover",
  "&:hover": { bgcolor: "action.selected" },
};
// How long the name of a saved-lessons list may be. This mirrors a limit the
// SERVER owns — playlists.title is VARCHAR(120) and servicesSaves.js rejects
// anything longer with a 400 — because the two repositories share no code and
// the client cannot import it. Kept here rather than inline in the save menu so
// this file is the one place the client states it, and so the next screen that
// needs it copies a name instead of the number 120.
//
// If the server's limit ever changes, this has to be changed with it; the
// mismatch is not silent in the harmful direction — a client cap that is too low
// only stops the user early, and one that is too high surfaces the server's 400.
export const playlistTitleMaxLength = 120;

// ── Attribution ─────────────────────────────────────────────────────────────
//
// media_items.creator_name answers "who said this" and is ONE column, but it is
// not called one thing: a lecture has a מרצה and a book has a מחבר. The wording
// is a rendering decision keyed on media_type, which is why it lives here beside
// the other display labels rather than being written out at each screen.
//
// Two columns would have meant a "which one do I read?" branch in every query,
// every card and every filter, for what is a single fact.
export const creatorLabels = { video: "שם המרצה", audio: "שם המרצה", text: "שם המחבר" };

// The same fact, worded for a card or a heading rather than a form field.
export const creatorPrefixes = { video: "מרצה", audio: "מרצה", text: "מחבר" };

// What the server stores when nobody said. Mirrors DEFAULT_CREATOR in the
// server's servicesMedia.js — the two repositories share no code, so this is a
// copy, and it is display-only: the client never WRITES this value, it only
// recognises it. The upload form leaves the field blank and lets the server
// decide, so a drift here cannot produce a wrong row.
export const defaultCreatorName = "כללי";

// Mirrors CREATOR_NAME_MAX in the server's servicesMedia.js and VARCHAR(120) in
// migration 020, for the same reason playlistTitleMaxLength does: a cap that is
// too low only stops the user early, and one that is too high surfaces the
// server's 400.
export const creatorNameMaxLength = 120;

// Mirrors TAGS_PER_ITEM_MAX in the server's servicesTags.js. Not a storage
// limit — a legibility one: a card showing fifteen tags shows nothing, and an
// item tagged with everything is findable under nothing.
export const MAX_TAGS = 8;

export const roleLabels = { student: "תלמיד", lecturer: "מרצה", admin: "מנהל" };
export const sessionTypeLabels = { "1on1": "אחד על אחד", group: "קבוצה", webinar: "וובינר" };
