import { describe, it, expect } from "vitest";
import { rosterCsv, rosterFileName, CSV_BOM } from "./rosterCsv";

const rows = (csv) => csv.split("\r\n");

describe("rosterCsv", () => {
  it("opens with a Hebrew header row", () => {
    expect(rows(rosterCsv([]))).toEqual(["שם,אימייל,תאריך רישום,פעיל"]);
  });

  it("writes one row per student, with an ISO date in Israel's zone", () => {
    // 22:30 UTC on Oct 31 is already Nov 1 in Israel.
    const csv = rosterCsv([
      { display_name: "משה כהן", email: "m@example.com", enrolled_at: "2026-10-31T22:30:00Z", is_active: true },
    ]);
    expect(rows(csv)[1]).toBe("משה כהן,m@example.com,2026-11-01,כן");
  });

  it("marks a deactivated account", () => {
    const csv = rosterCsv([{ display_name: "א", email: "a@x.com", enrolled_at: null, is_active: false }]);
    expect(rows(csv)[1]).toBe("א,a@x.com,,לא");
  });

  it("quotes a field holding a comma or a quote, doubling the quote", () => {
    const csv = rosterCsv([{ display_name: 'כהן, משה "הקטן"', email: "m@x.com" }]);
    expect(rows(csv)[1].startsWith('"כהן, משה ""הקטן""",')).toBe(true);
  });

  it("keeps a line break inside one quoted field", () => {
    const csv = rosterCsv([{ display_name: "שורה\nשנייה", email: "m@x.com" }]);
    expect(csv).toContain('"שורה\nשנייה"');
  });

  // A name is user input; a spreadsheet would run it.
  it("defuses a name that would open as a formula", () => {
    for (const name of ["=1+1", "+972", "-3", "@SUM(A1)"]) {
      const csv = rosterCsv([{ display_name: name, email: "m@x.com" }]);
      expect(rows(csv)[1].startsWith(`'${name}`)).toBe(true);
    }
  });

  it("names the file after the course, without characters Windows refuses", () => {
    expect(rosterFileName("גמרא: פרק א")).toBe("תלמידים - גמרא פרק א.csv");
    expect(rosterFileName('a\\b/c*d?"e<f>g|h')).toBe("תלמידים - abcdefgh.csv");
    expect(rosterFileName("")).toBe("תלמידים.csv");
  });

  it("exports the BOM Excel needs to read UTF-8", () => {
    expect(CSV_BOM).toBe("﻿");
  });
});
