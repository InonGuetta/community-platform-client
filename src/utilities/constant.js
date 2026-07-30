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
export const roleLabels = { student: "תלמיד", lecturer: "מרצה", admin: "מנהל" };
export const sessionTypeLabels = { "1on1": "אחד על אחד", group: "קבוצה", webinar: "וובינר" };
