export const roles = { student: "student", lecturer: "lecturer", admin: "admin" };
export const statuses = { idle: "idle", loading: "loading", succeeded: "succeeded", failed: "failed" };
export const mediaTypes = { video: "video", audio: "audio", text: "text" };
export const sessionTypes = { oneOnOne: "1on1", group: "group", webinar: "webinar" };

// Hebrew display labels, keyed by the raw stored value (media_type / role /
// session_type). Display-only — nothing persists or filters by these labels, so
// the single source of truth here can't drift across components.
export const mediaTypeLabels = { video: "וידאו", audio: "אודיו", text: "טקסט" };
export const roleLabels = { student: "תלמיד", lecturer: "מרצה", admin: "מנהל" };
export const sessionTypeLabels = { "1on1": "אחד על אחד", group: "קבוצה", webinar: "וובינר" };
