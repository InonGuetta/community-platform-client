import { csvCell, isoDate } from "./rosterCsv";
import i18n from "../i18n/i18n";

// The lecturer's report (PRD CRS-4) as a spreadsheet: one row per student, one
// column per recording in track order, and the totals a lecturer sorts by.
// The cells are words, not symbols, so the file reads the same in Excel as on
// the page.

const statusWord = (status) =>
  ({ done: i18n.t("format:csv.statusDone"), started: i18n.t("format:csv.statusStarted") })[status] ?? "";

export const reportFileName = (courseTitle) => {
  const base = i18n.t("format:csv.progressFile", { course: courseTitle || "" }).replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
  return `${base.replace(/ -$/, "") || i18n.t("format:csv.progress")}.csv`;
};

export const reportCsv = (report) => {
  const lessons = report?.lessons ?? [];
  const header = [...["name", "email", "completed", "started", "lastActivity"].map((key) => i18n.t(`format:csv.${key}`)), ...lessons.map((l, i) => `${i + 1}. ${l.title}`)];
  const rows = (report?.students ?? []).map((s) => [
    s.display_name || "",
    s.email || "",
    `${s.completed}/${lessons.length}`,
    s.started,
    isoDate(s.lastActivity),
    ...lessons.map((l) => statusWord(s.cells?.[l.id]?.status)),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
};
