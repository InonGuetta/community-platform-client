import { describe, it, expect } from "vitest";
import { mediaSessionMetadata, positionState } from "./useMediaSession";

// What the lock screen shows and its progress bar (PRD MOB-3).

describe("the lock screen's words", () => {
  it("names the lesson, the lecturer and the course", () => {
    const meta = mediaSessionMetadata({ title: "פרשת השבוע", creator_name: "הרב כהן", course_title: "גמרא" });
    expect(meta.title).toBe("פרשת השבוע");
    expect(meta.artist).toBe("הרב כהן");
    expect(meta.album).toBe("גמרא");
    expect(meta.artwork.map((a) => a.sizes)).toEqual(["192x192", "512x512"]);
  });

  // "כללי" is the archive's word for "nobody recorded a name".
  it("shows no lecturer rather than 'כללי'", () => {
    expect(mediaSessionMetadata({ title: "א", creator_name: "כללי" }).artist).toBe("");
  });

  it("falls back to the platform's name for a lesson in no course, and puts a thumbnail first", () => {
    const meta = mediaSessionMetadata({ title: "א", thumbnail_url: "/t.jpg" });
    expect(meta.album).toBe("פלטפורמת הקהילה");
    expect(meta.artwork[0]).toEqual({ src: "/t.jpg" });
  });
});

describe("the lock screen's progress bar", () => {
  it("reports where the lesson is", () => {
    expect(positionState(600, 90, 1.5)).toEqual({ duration: 600, position: 90, playbackRate: 1.5 });
  });

  // setPositionState throws on these, and they happen while a file loads.
  it("reports nothing until the length is known", () => {
    expect(positionState(0, 0, 1)).toBeNull();
    expect(positionState(NaN, 5, 1)).toBeNull();
  });

  it("never puts the position past the end", () => {
    expect(positionState(600, 610, 1).position).toBe(600);
  });
});
