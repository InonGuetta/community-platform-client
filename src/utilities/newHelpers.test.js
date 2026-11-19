import { test, expect, describe } from "vitest";
import { partOfDay } from "./greeting";
import { questionsIn } from "./suggestedQuestions";
import {
  looksLikePicture, MAX_SOURCE_BYTES, coverScale, clampOffset, centredOffset, zoomAbout, sourceRect, MAX_ZOOM,
} from "./avatarImage";

describe("partOfDay — the archive's greeting", () => {
  const at = (hour, minute = 0) => new Date(2026, 10, 17, hour, minute);
  test.each([
    [4, 59, "night"],
    [5, 0, "morning"],
    [11, 59, "morning"],
    [12, 0, "afternoon"],
    [16, 59, "afternoon"],
    [17, 0, "evening"],
    [20, 59, "evening"],
    [21, 0, "night"],
    [0, 0, "night"],
  ])("%i:%i is %s", (hour, minute, part) => {
    expect(partOfDay(at(hour, minute))).toBe(part);
  });
});

describe("questionsIn — a lesson's suggested questions in the reader's language", () => {
  const stored = { he: ["מה?"], en: ["What?"] };
  test("the reader's own language, when the lesson has it", () => {
    expect(questionsIn(stored, "en")).toEqual(["What?"]);
    expect(questionsIn(stored, "he")).toEqual(["מה?"]);
  });
  test("nothing — so the fixed questions in that language — when it does not", () => {
    expect(questionsIn(stored, "fr")).toBe(null);
    expect(questionsIn({ fr: [] }, "fr")).toBe(null);
    expect(questionsIn(null, "en")).toBe(null);
  });
  // A row from before migration 053 holds one Hebrew list: Hebrew only.
  test("an older lesson's Hebrew list is offered in Hebrew and nowhere else", () => {
    expect(questionsIn(["מה?"], "he")).toEqual(["מה?"]);
    expect(questionsIn(["מה?"], "en")).toBe(null);
  });
});

// The crop editor's arithmetic: a 400×300 picture in a 240px viewport.
describe("framing the profile picture", () => {
  const picture = { width: 400, height: 300, view: 240 };

  test("at zoom 1 the picture just covers the viewport, centred", () => {
    expect(coverScale(400, 300, 240)).toBe(0.8);
    expect(centredOffset({ ...picture, zoom: 1 })).toEqual({ x: -40, y: 0 });
    // Centred and unzoomed is the middle square of the original.
    expect(sourceRect({ x: -40, y: 0 }, { ...picture, zoom: 1 })).toEqual({ sx: 50, sy: 0, size: 300 });
  });

  test("the picture cannot be dragged off the circle", () => {
    expect(clampOffset({ x: 50, y: 30 }, { ...picture, zoom: 1 })).toEqual({ x: 0, y: 0 });
    expect(clampOffset({ x: -500, y: -500 }, { ...picture, zoom: 1 })).toEqual({ x: -80, y: 0 });
  });

  test("dragged to an edge, that edge's square is what is saved", () => {
    expect(sourceRect({ x: 0, y: 0 }, { ...picture, zoom: 1 })).toEqual({ sx: 0, sy: 0, size: 300 });
    expect(sourceRect({ x: -80, y: 0 }, { ...picture, zoom: 1 })).toEqual({ sx: 100, sy: 0, size: 300 });
  });

  test("zooming keeps the point under the finger still, and stays in bounds", () => {
    const { zoom, offset } = zoomAbout({ x: -40, y: 0 }, 1, 2, { x: 120, y: 120 }, picture);
    expect(zoom).toBe(2);
    // About the centre: the centre of the picture stays at the centre.
    expect(offset).toEqual({ x: -200, y: -120 });
    expect(sourceRect(offset, { ...picture, zoom })).toEqual({ sx: 125, sy: 75, size: 150 });
    expect(zoomAbout({ x: -40, y: 0 }, 1, 99, { x: 120, y: 120 }, picture).zoom).toBe(MAX_ZOOM);
    expect(zoomAbout({ x: -40, y: 0 }, 1, 0.2, { x: 120, y: 120 }, picture).zoom).toBe(1);
  });
  test("only a picture-sized picture is worth decoding", () => {
    expect(looksLikePicture(new Blob(["x"], { type: "image/png" }))).toBe(true);
    expect(looksLikePicture(new Blob(["x"], { type: "" }))).toBe(true);
    expect(looksLikePicture(new Blob(["x"], { type: "application/pdf" }))).toBe(false);
    expect(looksLikePicture(new Blob([], { type: "image/png" }))).toBe(false);
    expect(looksLikePicture({ size: MAX_SOURCE_BYTES + 1, type: "image/jpeg" })).toBe(false);
    expect(looksLikePicture(null)).toBe(false);
  });
});
