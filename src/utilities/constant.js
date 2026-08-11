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

export const roleLabels = { student: "תלמיד", lecturer: "מרצה", admin: "מנהל" };
export const sessionTypeLabels = { "1on1": "אחד על אחד", group: "קבוצה", webinar: "וובינר" };
