// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { buildTheme } from "../../../theme/theme";
import Dock from "./Dock";

// The dock (component 4): three links — the archive, "שאל את הארכיון", the
// reader's courses — each named in full for a screen reader, the current page
// marked, and nothing marked on the course management page (decision 4).

const renderAt = (path) =>
  render(
    <ThemeProvider theme={buildTheme("light")}>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Dock />
      </MemoryRouter>
    </ThemeProvider>
  );

const dock = () => screen.getByRole("navigation", { name: "ניווט מהיר" });
const current = () => within(dock()).getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");

test("holds the archive, ask and my courses, in that order, by their full names", () => {
  renderAt("/archive");
  const links = within(dock()).getAllByRole("link");
  expect(links.map((a) => a.getAttribute("href"))).toEqual(["/archive", "/ask", "/my-courses"]);
  expect(links.map((a) => a.getAttribute("aria-label"))).toEqual(["ארכיון", "שאל את הארכיון", "הקורסים שלי"]);
});

test("marks the page you are on", () => {
  renderAt("/ask");
  expect(current().map((a) => a.getAttribute("href"))).toEqual(["/ask"]);
});

test("one course's page counts as my courses", () => {
  renderAt("/my-courses/12");
  expect(current().map((a) => a.getAttribute("href"))).toEqual(["/my-courses"]);
});

test("course management marks nothing", () => {
  renderAt("/courses");
  expect(current()).toHaveLength(0);
});

test("a lesson marks nothing", () => {
  renderAt("/media/5");
  expect(current()).toHaveLength(0);
});
