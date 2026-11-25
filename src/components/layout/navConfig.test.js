import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { navConfigFor, isActive, PRIMARY_LINKS, DOCK_ITEMS, ADMIN_ITEMS, PERSONAL_ITEMS } from "./navConfig";
import { PERSONAL_SHELVES } from "./personalShelves";

// navConfig is the one description of the navigation (decision 3). These pin
// what each role gets, what counts as the current page (D-31), and that every
// place it links to is a route App actually has.

const ids = (items) => items.map((item) => item.id);

test("the five primary links, in the header's order", () => {
  expect(PRIMARY_LINKS.map((l) => l.to)).toEqual(["/archive", "/ask", "/my-courses", "/sessions", "/donate"]);
});

test("the dock is three of them", () => {
  expect(DOCK_ITEMS.map((l) => l.to)).toEqual(["/archive", "/ask", "/my-courses", "/notebook"]);
  for (const item of DOCK_ITEMS) expect(item.gradient).toMatch(/^linear-gradient/);
});

test("the personal items are every shelf, then the account", () => {
  expect(PERSONAL_ITEMS.map((i) => i.to)).toEqual([...PERSONAL_SHELVES.map((s) => s.path), "/profile"]);
});

test("each role gets the management items it had before, and no more", () => {
  expect(navConfigFor("student").admin).toEqual([]);
  expect(ids(navConfigFor("lecturer").admin)).toEqual(["manageCourses", "upload"]);
  expect(ids(navConfigFor("admin").admin)).toEqual(["admin", "users", "manageCourses", "upload"]);
  expect(navConfigFor(undefined).admin).toEqual([]);
  expect(navConfigFor("something-new").admin).toEqual([]);
});

test("what counts as the current page", () => {
  const [archive, , myCourses, sessions] = PRIMARY_LINKS;
  expect(isActive(archive, "/archive")).toBe(true);
  expect(isActive(archive, "/archive/x")).toBe(false);
  expect(isActive(myCourses, "/my-courses")).toBe(true);
  expect(isActive(myCourses, "/my-courses/4")).toBe(true);
  expect(isActive(myCourses, "/my-coursesX")).toBe(false);
  expect(isActive(sessions, "/sessions/4")).toBe(false);
  for (const link of PRIMARY_LINKS) expect(isActive(link, "/courses")).toBe(false);
  expect(isActive(ADMIN_ITEMS.find((i) => i.action), "/archive")).toBe(false);
});

// A link to a path with no route falls through to "*" (=> /archive) with no
// error. App's routes are read as text: rendering App here would need the
// whole store and every page.
test("every place navConfig links to is a route in App.jsx", () => {
  const app = readFileSync(new URL("../../App.jsx", import.meta.url), "utf8");
  const routes = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
  expect(routes.length).toBeGreaterThan(10);
  const fixed = [...PRIMARY_LINKS, ...ADMIN_ITEMS, PERSONAL_ITEMS.at(-1)].filter((i) => i.to);
  for (const item of fixed) expect(routes, item.to).toContain(item.to);
});

// UI_UX_FIXES 3.1: a lesson is opened from the archive, which stays lit.
test("a lesson lights the archive and nothing else", () => {
  const lit = PRIMARY_LINKS.filter((link) => isActive(link, "/media/5")).map((l) => l.id);
  expect(lit).toEqual(["archive"]);
});
