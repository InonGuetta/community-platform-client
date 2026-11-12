// A stored timestamp as a Hebrew calendar date: "7 בספטמבר 2026".
//
// In Israel's zone, named rather than taken from the reader's machine — the
// same zone the server measures the archive's date filter in (servicesMedia's
// DISPLAY_TIMEZONE). A lesson uploaded at 1am Israel time is that day here,
// whichever laptop it is read on, and it is the same day the date filter puts
// it on.
//
// Empty for a value that is not a date, so a caller can render nothing rather
// than "Invalid Date".
export const formatHebrewDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jerusalem",
  });
};

// ── The other three, as their screens have always written them ──────────────
//
// Each was a private copy in the file that used it — the long one in three
// files at once. They are gathered here unchanged, NOT folded into
// formatHebrewDate: they read the reader's own clock rather than Israel's, and
// two of them print "Invalid Date" for a value that is not a date. Making them
// agree with the rule above would change what a screen shows, so it is a
// decision for its own commit rather than a side effect of moving code.

// "7 בספטמבר 2026" in the reader's own zone — a note's "עודכן לאחרונה", the
// notebook's index, and the date in an exported notebook.
export const formatLocalHebrewDate = (value) =>
  value ? new Date(value).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : "";

// "7.9.2026" — the admin's tag proposals.
export const formatShortHebrewDate = (value) => (value ? new Date(value).toLocaleDateString("he-IL") : "");

// "7.9.2026, 19:30" — a session's start, a failed job's time. `empty` is what
// a missing value shows: nothing on the sessions page, a dash in a table.
export const formatHebrewDateTime = (value, empty = "") =>
  value ? new Date(value).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : empty;
