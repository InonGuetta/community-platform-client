// Every date the platform shows, in one place.
//
// The rule: a calendar date is Israel's, named rather than taken from the
// reader's machine — the same zone the server measures the archive's date filter
// in (servicesMedia's DISPLAY_TIMEZONE). A lesson uploaded at 1am Israel time is
// that day here, whichever laptop it is read on, and it is the same day the
// date filter puts it on.
//
// And a value that is not a date shows nothing (or the caller's placeholder),
// never "Invalid Date".

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const ISRAEL = "Asia/Jerusalem";

// "7 בספטמבר 2026" — a lesson's date, a note's "עודכן לאחרונה", the notebook's
// index, the date in an exported notebook.
export const formatHebrewDate = (value) =>
  asDate(value)?.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: ISRAEL }) ?? "";

// "7.9.2026" — the admin's tag proposals.
export const formatShortHebrewDate = (value) =>
  asDate(value)?.toLocaleDateString("he-IL", { timeZone: ISRAEL }) ?? "";

// "7.9.2026, 19:30" — a session's start, a failed job's time. `empty` is what a
// missing value shows: nothing on the sessions page, a dash in a table.
//
// The one exception to Israel's clock, on purpose: a session is scheduled in a
// datetime-local field, which is the reader's own clock, and the time shown on
// its card has to be the time that was typed. (The bell's session notices are
// worded in Israel's zone; see notificationText.js.)
export const formatHebrewDateTime = (value, empty = "") =>
  asDate(value)?.toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) ?? empty;
