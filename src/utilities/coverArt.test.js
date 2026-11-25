import { test, expect } from "vitest";
import { PALETTES, PALETTE_KEYS, paletteKeyFor, paletteFor, coverKindFor, AUDIO_BARS, AUDIO_RINGS } from "./coverArt";

test("there are the mockup's fifteen palettes, each a start, an end and a foreground", () => {
  expect(PALETTE_KEYS).toHaveLength(15);
  for (const colours of Object.values(PALETTES)) {
    expect(colours).toHaveLength(3);
    for (const c of colours) expect(c).toMatch(/^#[0-9a-f]{3,6}$/i);
  }
});

test("an item always gets the same palette, whether its id is a number or a string", () => {
  expect(paletteKeyFor(42)).toBe(paletteKeyFor(42));
  expect(paletteKeyFor(42)).toBe(paletteKeyFor("42"));
  expect(paletteFor(42)).toBe(PALETTES[paletteKeyFor(42)]);
});

test("ids spread across the palettes rather than piling into one", () => {
  const used = new Set(Array.from({ length: 200 }, (_, i) => paletteKeyFor(i + 1)));
  expect(used.size).toBeGreaterThanOrEqual(12);
});

test("a missing id still gets a palette", () => {
  expect(PALETTE_KEYS).toContain(paletteKeyFor(undefined));
});

test("the shape follows the type, and an unknown type is drawn as a book", () => {
  expect(coverKindFor("audio")).toBe("audio");
  expect(coverKindFor("video")).toBe("video");
  expect(coverKindFor("text")).toBe("book");
  expect(coverKindFor("podcast")).toBe("book");
});

test("the sound wave is five fading rings and seven bars centred on one line", () => {
  expect(AUDIO_RINGS.map((r) => r.r)).toEqual([26, 52, 78, 104, 130]);
  expect(AUDIO_RINGS[0].opacity).toBeGreaterThan(AUDIO_RINGS[4].opacity);
  expect(AUDIO_BARS).toHaveLength(7);
  for (const bar of AUDIO_BARS) expect(bar.y + bar.h / 2).toBe(100);
});
