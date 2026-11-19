import { test, expect } from "vitest";
import { featuredItem } from "./featuredItem";

const items = [
  { id: 3, is_published: false },
  { id: 2, is_published: true },
  { id: 1, is_published: true },
];

test("the banner shows the first published item of the newest-first archive, never a draft", () => {
  expect(featuredItem(items)).toEqual({ id: 2, is_published: true });
  expect(featuredItem([{ id: 1, is_published: false }])).toBeNull();
  expect(featuredItem([])).toBeNull();
});

test("there is no banner under a search, a filter, a type, or another order", () => {
  expect(featuredItem(items, { hasActiveFilter: true })).toBeNull();
  expect(featuredItem(items, { sortOrder: "oldest" })).toBeNull();
  expect(featuredItem(items, { sortOrder: "newest" })).not.toBeNull();
});
