import { csvCell, isoDate } from "./rosterCsv";

// The lecturer's report (PRD CRS-4) as a spreadsheet: one row per student, one
// column per recording in track order, and the totals a lecturer sorts by.
// The cells are words, not symbols, so the file reads the same in Excel as on
// the page.

const STATUS_WORD = { done: "הושלם", started: "התחיל", none: "" };

export const reportFileName = (courseTitle) => {
  const base = `התקדמות - ${courseTitle || ""}`.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
  return `${base.replace(/ -$/, "") || "התקדמות"}.csv`;
};

export const reportCsv = (report) => {
  const lessons = report?.lessons ?? [];
  const header = ["שם", "אימייל", "הושלמו", "התחילו", "פעילות אחרונה", ...lessons.map((l, i) => `${i + 1}. ${l.title}`)];
  const rows = (report?.students ?? []).map((s) => [
    s.display_name || "",
    s.email || "",
    `${s.completed}/${lessons.length}`,
    s.started,
    isoDate(s.lastActivity),
    ...lessons.map((l) => STATUS_WORD[s.cells?.[l.id]?.status] ?? ""),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
};
