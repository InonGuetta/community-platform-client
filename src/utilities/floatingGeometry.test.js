import { test, expect, describe, beforeEach, vi } from "vitest";
import {
  MIN_WIDTH,
  MIN_HEIGHT,
  defaultGeometry,
  clampToViewport,
  resizeBy,
  readGeometry,
  writeGeometry,
} from "./floatingGeometry";

const viewport = { width: 1440, height: 900 };

describe("resizing", () => {
  const start = { x: 200, y: 100, width: 600, height: 400 };

  test("an east drag widens without moving the window", () => {
    expect(resizeBy(start, "e", 120, 0)).toEqual({ ...start, width: 720 });
  });

  test("a west drag moves the origin by exactly what it takes off the width", () => {
    const next = resizeBy(start, "w", 100, 0);
    expect(next).toEqual({ ...start, x: 300, width: 500 });
    // The right edge is what the user is NOT dragging, so it must not move.
    expect(next.x + next.width).toBe(start.x + start.width);
  });

  test("a corner drag applies both axes", () => {
    expect(resizeBy(start, "se", 50, 60)).toEqual({ ...start, width: 650, height: 460 });
  });

  // The bug this whole module exists to make testable: clamping the width alone
  // leaves the origin free to keep travelling, so a window at its minimum slides
  // sideways under the cursor instead of simply refusing to shrink.
  test("a west drag past the minimum width stops the origin too", () => {
    const next = resizeBy(start, "w", 9999, 0);
    expect(next.width).toBe(MIN_WIDTH);
    expect(next.x).toBe(start.x + start.width - MIN_WIDTH);
    expect(next.x + next.width).toBe(start.x + start.width);
  });

  test("a north drag past the minimum height stops the origin too", () => {
    const next = resizeBy(start, "n", 9999, 0);
    // dy is the second delta; "n" reads it, and a lone dx must not move it.
    expect(next).toEqual(start);

    const dragged = resizeBy(start, "n", 0, 9999);
    expect(dragged.height).toBe(MIN_HEIGHT);
    expect(dragged.y + dragged.height).toBe(start.y + start.height);
  });

  test("west and north drags can also GROW the window", () => {
    const next = resizeBy(start, "nw", -100, -50);
    expect(next).toEqual({ x: 100, y: 50, width: 700, height: 450 });
  });
});

describe("staying reachable", () => {
  test("a window dragged off the right keeps a strip on screen", () => {
    const next = clampToViewport({ x: 5000, y: 100, width: 600, height: 400 }, viewport);
    expect(next.x).toBeLessThan(viewport.width);
    expect(next.x + next.width).toBeGreaterThan(viewport.width);
  });

  test("a window dragged off the left keeps a strip on screen", () => {
    const next = clampToViewport({ x: -5000, y: 100, width: 600, height: 400 }, viewport);
    expect(next.x + next.width).toBeGreaterThan(0);
  });

  // The header is the only drag handle, so above the top there is no way back.
  test("the header can never go above the top of the screen", () => {
    expect(clampToViewport({ x: 0, y: -400, width: 600, height: 400 }, viewport).y).toBe(0);
  });

  test("the header can never be pushed below the bottom", () => {
    const next = clampToViewport({ x: 0, y: 99999, width: 600, height: 400 }, viewport);
    expect(next.y).toBeLessThan(viewport.height);
  });

  test("a window wider than the screen is cut down to it", () => {
    const next = clampToViewport({ x: 0, y: 0, width: 9000, height: 9000 }, viewport);
    expect(next.width).toBe(viewport.width);
    expect(next.height).toBe(viewport.height);
  });

  // A phone-sized viewport is narrower than the minimum. Clamping naively here
  // produces min > max and NaN-ish geometry; the window should stay usable.
  test("a viewport smaller than the minimum still yields a sane window", () => {
    const next = clampToViewport({ x: 0, y: 0, width: 600, height: 400 }, { width: 200, height: 150 });
    expect(next.width).toBe(MIN_WIDTH);
    expect(next.height).toBe(MIN_HEIGHT);
    expect(Number.isFinite(next.x)).toBe(true);
    expect(Number.isFinite(next.y)).toBe(true);
  });
});

test("the default window is centred and fits inside the viewport", () => {
  const g = defaultGeometry(viewport);
  expect(g.x).toBe(Math.round((viewport.width - g.width) / 2));
  expect(g.y).toBe(Math.round((viewport.height - g.height) / 2));
  expect(g.width).toBeLessThanOrEqual(viewport.width);
  expect(g.height).toBeLessThanOrEqual(viewport.height);
});

describe("remembering what the user chose", () => {
  const KEY = "test:geometry";
  const store = new Map();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, v),
    });
  });

  test("a round trip returns what was written", () => {
    const geometry = { x: 120, y: 80, width: 700, height: 500 };
    writeGeometry(KEY, geometry);
    expect(readGeometry(KEY, viewport)).toEqual(geometry);
  });

  test("nothing stored yet falls back to the default", () => {
    expect(readGeometry(KEY, viewport)).toEqual(defaultGeometry(viewport));
  });

  test("garbage in storage falls back rather than throwing", () => {
    store.set(KEY, "{{{not json");
    expect(readGeometry(KEY, viewport)).toEqual(defaultGeometry(viewport));
  });

  test("a partial object is rejected, not half-applied", () => {
    store.set(KEY, JSON.stringify({ x: 10, width: 500 }));
    expect(readGeometry(KEY, viewport)).toEqual(defaultGeometry(viewport));
  });

  // Saved on a wide monitor, reopened on a laptop: the stored size would hang
  // off the screen, so it is clamped on the way out and not only on the way in.
  test("geometry saved on a bigger screen is clamped to the current one", () => {
    writeGeometry(KEY, { x: 2400, y: 60, width: 1800, height: 1200 });
    const next = readGeometry(KEY, viewport);
    expect(next.width).toBeLessThanOrEqual(viewport.width);
    expect(next.height).toBeLessThanOrEqual(viewport.height);
    expect(next.x).toBeLessThan(viewport.width);
  });

  test("storage that throws does not take the caller down with it", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("quota"); },
    });
    expect(() => writeGeometry(KEY, { x: 0, y: 0, width: 500, height: 400 })).not.toThrow();
    expect(readGeometry(KEY, viewport)).toEqual(defaultGeometry(viewport));
  });
});
