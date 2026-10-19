import { describe, test, expect } from "vitest";
import {
  DURATION_OPTIONS, readDuration, durationParams, lengthApplies, lengthLabel,
} from "./durationOptions";

describe("the length ranges", () => {
  test("are the four agreed, shortest first", () => {
    expect(DURATION_OPTIONS.map((o) => o.label)).toEqual([
      "0–15 דקות", "15–30 דקות", "30–60 דקות", "מעל 60 דקות",
    ]);
  });

  // Min inclusive, max exclusive on the server: each range must start exactly
  // where the one before it ends, or a lesson falls into a gap or into two.
  test("meet end to end, with no gap and no overlap", () => {
    expect(DURATION_OPTIONS[0].min).toBeUndefined();
    expect(DURATION_OPTIONS.at(-1).max).toBeUndefined();
    for (let i = 1; i < DURATION_OPTIONS.length; i += 1) {
      expect(DURATION_OPTIONS[i].min).toBe(DURATION_OPTIONS[i - 1].max);
    }
  });
});

describe("what a range sends", () => {
  test("seconds, with an open end left out", () => {
    expect(durationParams("short")).toEqual({ maxDuration: 900 });
    expect(durationParams("medium")).toEqual({ minDuration: 900, maxDuration: 1800 });
    expect(durationParams("long")).toEqual({ minDuration: 1800, maxDuration: 3600 });
    expect(durationParams("xlong")).toEqual({ minDuration: 3600 });
  });

  test("nothing when no range is chosen, or one that does not exist", () => {
    expect(durationParams("")).toEqual({});
    expect(durationParams("banana")).toEqual({});
  });
});

describe("reading a range from an address", () => {
  test("keeps a known one and drops anything else", () => {
    expect(readDuration("long")).toBe("long");
    expect(readDuration("banana")).toBe("");
    expect(readDuration(null)).toBe("");
  });
});

describe("when a length means anything", () => {
  test("for everything, recordings, or a mix with reading", () => {
    expect(lengthApplies([])).toBe(true);
    expect(lengthApplies(["audio"])).toBe(true);
    expect(lengthApplies(["video", "text"])).toBe(true);
  });

  // A book has no length.
  test("not for reading alone", () => {
    expect(lengthApplies(["text"])).toBe(false);
  });
});

describe("a length as a card says it", () => {
  test("minutes, then hours and minutes", () => {
    expect(lengthLabel(967)).toBe("16 דק׳");
    expect(lengthLabel(3600)).toBe("1 שע׳");
    expect(lengthLabel(7119)).toBe("1 שע׳ 59 דק׳");
    expect(lengthLabel(11865)).toBe("3 שע׳ 18 דק׳");
  });

  test("seconds for a clip under a minute", () => {
    expect(lengthLabel(15)).toBe("15 שנ׳");
  });

  test("nothing at all when there is no length", () => {
    expect(lengthLabel(null)).toBe(null);
    expect(lengthLabel(undefined)).toBe(null);
    expect(lengthLabel(0)).toBe(null);
  });
});
