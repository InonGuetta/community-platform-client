import { describe, it, expect } from "vitest";
import { creatorSummary, recordedLength } from "./creatorSummary";
import { creatorPath, hasCreatorPage } from "../../../utilities/creatorPage";

// The line under a lecturer's name, and the path to their page (PRD ATTR-10).

describe("the summary line", () => {
  it("counts by kind, the hours, and the latest", () => {
    expect(
      creatorSummary({ media_count: 5, video_count: 2, audio_count: 2, text_count: 1, total_seconds: 9000, latest_at: "2026-11-01T10:00:00Z" })
    ).toBe("5 פריטים (2 וידאו, 2 הקלטות שמע, ספר אחד) · 2.5 שעות הקלטה · אחרון: 1 בנובמבר 2026");
  });

  it("names a single kind instead of counting twice", () => {
    expect(creatorSummary({ media_count: 3, audio_count: 3, total_seconds: 0, latest_at: null })).toBe("3 הקלטות שמע");
    expect(creatorSummary({ media_count: 1, text_count: 1, total_seconds: 0 })).toBe("ספר אחד");
  });

  it("says minutes under an hour, and nothing for nothing measured", () => {
    expect(recordedLength(15420)).toBe("4.3 שעות הקלטה");
    expect(recordedLength(3600)).toBe("שעת הקלטה אחת");
    expect(recordedLength(600)).toBe("10 דקות הקלטה");
    expect(recordedLength(0)).toBeNull();
  });
});

describe("the page's address", () => {
  it("is the name, encoded", () => {
    expect(creatorPath("הרב כהן")).toBe(`/creators/${encodeURIComponent("הרב כהן")}`);
    expect(creatorPath("א/ב?")).toBe("/creators/%D7%90%2F%D7%91%3F");
  });

  it("exists for a person, not for the unattributed placeholder", () => {
    expect(hasCreatorPage("הרב כהן")).toBe(true);
    expect(hasCreatorPage("כללי")).toBe(false);
    expect(hasCreatorPage("  ")).toBe(false);
    expect(hasCreatorPage(null)).toBe(false);
  });
});
