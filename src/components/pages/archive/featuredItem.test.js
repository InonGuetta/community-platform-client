import { test, expect } from "vitest";
import { featuredItem, heroItem } from "./featuredItem";

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

test("the banner resumes the first continue-watching item, and falls back to the newest", () => {
  const featured = { id: 2 };
  const resume = [{ id: 9 }, { id: 8 }];
  expect(heroItem(resume, featured)).toEqual({ item: { id: 9 }, resuming: true });
  expect(heroItem([], featured)).toEqual({ item: featured, resuming: false });
  expect(heroItem(undefined, featured)).toEqual({ item: featured, resuming: false });
});

test("no banner when the archive is narrowed, nor while the shelf is still loading", () => {
  expect(heroItem([{ id: 9 }], null)).toBeNull();
  expect(heroItem([{ id: 9 }], { id: 2 }, { settled: false })).toBeNull();
});
