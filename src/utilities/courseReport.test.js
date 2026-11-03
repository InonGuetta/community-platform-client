import { describe, it, expect } from "vitest";
import { reportCsv, reportFileName } from "./courseReport";

// The lecturer's report as a spreadsheet (PRD CRS-4).

describe("the report file", () => {
  const report = {
    lessons: [{ id: 1, title: "פתיחה" }, { id: 2, title: "המשנה, פרק א" }],
    students: [
      { display_name: "דנה", email: "d@example.com", completed: 1, started: 1, lastActivity: "2026-11-02T22:30:00Z",
        cells: { 1: { status: "done" }, 2: { status: "started" } } },
      { display_name: "=HYPERLINK(1)", email: "x@example.com", completed: 0, started: 0, lastActivity: null,
        cells: { 1: { status: "none" }, 2: { status: "none" } } },
    ],
  };

  it("has a row per student and a column per lesson, in words", () => {
    const [header, dana, other] = reportCsv(report).split("\r\n");
    expect(header).toBe('שם,אימייל,הושלמו,התחילו,פעילות אחרונה,1. פתיחה,"2. המשנה, פרק א"');
    // Israel's date: 22:30 UTC on the 2nd is already the 3rd there.
    expect(dana).toBe("דנה,d@example.com,1/2,1,2026-11-03,הושלם,התחיל");
    // A name that would run as a formula is kept as text.
    expect(other.startsWith("'=HYPERLINK(1)")).toBe(true);
  });

  it("is named after the course, without characters Windows refuses", () => {
    expect(reportFileName("גמרא: פרק א")).toBe("התקדמות - גמרא פרק א.csv");
    expect(reportFileName("")).toBe("התקדמות.csv");
  });
});
