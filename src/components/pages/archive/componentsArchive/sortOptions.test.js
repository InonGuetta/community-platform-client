import { describe, test, expect } from "vitest";
import { SORT_OPTIONS, DEFAULT_SORT, readSort } from "./sortOptions";

// The menu's vocabulary is the server's (lib/validate.js MEDIA_SORTS). The two
// repositories cannot import each other, so the list is pinned here: a value
// added or renamed on one side only is a request the server answers with 400.
describe("the sort orders", () => {
  test("are exactly the five the server accepts, newest first by default", () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual(["newest", "oldest", "title", "creator", "liked"]);
    expect(DEFAULT_SORT).toBe("newest");
  });

  test("each has a label to show", () => {
    for (const option of SORT_OPTIONS) expect(option.label.trim()).not.toBe("");
  });
});

describe("reading an order from an address", () => {
  test("keeps one the menu knows", () => {
    for (const { value } of SORT_OPTIONS) expect(readSort(value)).toBe(value);
  });

  // Sent on, it would be a 400 and an archive that will not load.
  test("turns anything else into the default rather than sending it", () => {
    expect(readSort("banana")).toBe(DEFAULT_SORT);
    expect(readSort("")).toBe(DEFAULT_SORT);
    expect(readSort(null)).toBe(DEFAULT_SORT);
    expect(readSort("Title")).toBe(DEFAULT_SORT);
  });
});
