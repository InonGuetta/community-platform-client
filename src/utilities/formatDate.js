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
