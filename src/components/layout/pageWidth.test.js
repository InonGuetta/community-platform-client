import { test, expect } from "vitest";
import { pageWidthFor, maxWidthOf } from "./pageWidth";

// Decision 7 / part B "Layout": which pages are 1180 and which 1080 (D-13).

test("grids, two columns and wide tables are wide", () => {
  for (const path of ["/archive", "/continue", "/likes", "/saved", "/saved/lists/3", "/creators/x", "/notebook", "/media/9", "/users", "/admin"]) {
    expect(pageWidthFor(path), path).toBe("wide");
  }
});

test("one-column pages are narrow", () => {
  for (const path of ["/ask", "/downloads", "/my-courses", "/my-courses/3", "/sessions", "/donate", "/donate/result", "/courses", "/profile"]) {
    expect(pageWidthFor(path), path).toBe("narrow");
  }
});

test("the live session room is full width", () => {
  expect(pageWidthFor("/sessions/12")).toBe("full");
});

test("the widths in px", () => {
  expect(maxWidthOf("wide")).toBe(1180);
  expect(maxWidthOf("narrow")).toBe(1080);
  expect(maxWidthOf("full")).toBeNull();
});
