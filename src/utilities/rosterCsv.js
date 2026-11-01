// A course's roster as a CSV file a lecturer can open in Excel.
//
// Built here from the roster the page already holds — GET /courses/:id/students
// returns exactly these columns to exactly the people allowed to export them, so
// a server endpoint would be a second door onto the same rows.

// Excel decides a CSV's encoding by looking for a byte-order mark. Without one
// it reads UTF-8 as the machine's ANSI code page, and every Hebrew name arrives
// as "×©×œ×•×". The BOM is the whole fix; LibreOffice and Google Sheets ignore it.
export const CSV_BOM = "﻿";

const HEADERS = ["שם", "אימייל", "תאריך רישום", "פעיל"];

// A cell that starts with one of these is run as a FORMULA when the file is
// opened — and a display name is something any user typed. "=HYPERLINK(...)" as
// a name would become a live link in the lecturer's spreadsheet. A leading
// apostrophe makes Excel read the cell as text and is not shown.
const FORMULA_START = /^[=+\-@\t\r]/;

// RFC 4180: a field holding a comma, a quote or a line break is quoted, and a
// quote inside it is doubled.
const cell = (value) => {
  let text = value === null || value === undefined ? "" : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// 2026-11-01 rather than "1 בנובמבר 2026": a spreadsheet sorts and filters an
// ISO date as a date, and a Hebrew month name as text. In Israel's zone, like
// every other date the platform shows (see formatDate.js).
const isoDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
};

// The download's name. Characters Windows refuses in a file name are dropped
// rather than replaced — a course called "גמרא: פרק א" becomes "גמרא פרק א".
export const rosterFileName = (courseTitle) => {
  const base = `תלמידים - ${courseTitle || ""}`.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
  return `${base.replace(/ -$/, "") || "תלמידים"}.csv`;
};

// CRLF between rows — what the RFC says, and what Excel on Windows expects.
// No BOM here; the caller prepends it to the blob, so this stays plain text a
// test can compare.
export const rosterCsv = (students) =>
  [
    HEADERS,
    ...students.map((s) => [s.display_name, s.email, isoDate(s.enrolled_at), s.is_active === false ? "לא" : "כן"]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
