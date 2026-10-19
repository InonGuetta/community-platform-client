import { describe, test, expect } from "vitest";
import {
  ALL_TYPES,
  isAllTypes,
  isTypePressed,
  toggleType,
  pressAllTypes,
  readTypes,
} from "./typeSelection";

describe("the default", () => {
  test("is everything, and only הכל is pressed — no type button is", () => {
    expect(isAllTypes([])).toBe(true);
    for (const t of ALL_TYPES) expect(isTypePressed([], t)).toBe(false);
  });
});

describe("pressing a type", () => {
  // The bug this file was rewritten for: from the default, pressing וידאו used
  // to take video OUT and show the other two.
  test("from everything, shows that type alone", () => {
    expect(toggleType([], "video")).toEqual(["video"]);
    expect(isTypePressed(["video"], "video")).toBe(true);
    expect(isTypePressed(["video"], "audio")).toBe(false);
  });

  test("adds a type that was out — and / and, not either / or", () => {
    expect(toggleType(["video"], "audio")).toEqual(["video", "audio"]);
  });

  test("takes out a type that was in", () => {
    expect(toggleType(["video", "audio"], "video")).toEqual(["audio"]);
  });

  // Two spellings of one state would have every caller asking twice.
  test("choosing every type one by one is everything, spelled the one way", () => {
    expect(toggleType(["video", "audio"], "text")).toEqual([]);
  });

  // A filter that matches nothing looks like an empty, broken archive.
  test("un-pressing the last type goes back to everything, not to nothing", () => {
    expect(toggleType(["video"], "video")).toEqual([]);
  });

  test("the order the types were pressed in does not matter", () => {
    expect(toggleType(["audio"], "video")).toEqual(toggleType(["video"], "audio"));
  });
});

describe("pressing הכל", () => {
  test("from a partial choice, shows everything", () => {
    expect(pressAllTypes(["video", "audio"])).toEqual([]);
  });

  // It used to give back the choice it had replaced, so the button labelled
  // "everything" could be the one that stopped showing everything.
  test("pressed again, still shows everything", () => {
    expect(pressAllTypes(pressAllTypes(["audio"]))).toEqual([]);
  });
});

describe("reading types from an address", () => {
  test("drops what is not a type, and orders the rest", () => {
    expect(readTypes(["audio", "banana", "video"])).toEqual(["video", "audio"]);
  });

  test("all three is everything", () => {
    expect(readTypes(["text", "audio", "video"])).toEqual([]);
  });

  test("nothing is everything", () => {
    expect(readTypes(undefined)).toEqual([]);
  });
});
