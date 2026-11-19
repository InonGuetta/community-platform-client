// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import i18n from "../../../i18n/i18n";
import BackLink from "./BackLink";

test("a link back to the route it names, its chevron pointing back", async () => {
  render(
    <MemoryRouter initialEntries={["/media/7"]}>
      <Routes>
        <Route path="/media/7" element={<BackLink to="/archive">הארכיון</BackLink>} />
        <Route path="/archive" element={<p>הגעת</p>} />
      </Routes>
    </MemoryRouter>
  );
  const link = screen.getByRole("link", { name: "הארכיון" });
  expect(link).toHaveAttribute("href", "/archive");
  // Back points right in Hebrew.
  expect(link.querySelector("svg")).toHaveAttribute("data-testid", "ChevronRightIcon");
  await userEvent.click(link);
  expect(screen.getByText("הגעת")).toBeInTheDocument();
});

test("in English the chevron points left", async () => {
  await act(() => i18n.changeLanguage("en"));
  render(
    <MemoryRouter>
      <BackLink to="/">Archive</BackLink>
    </MemoryRouter>
  );
  expect(screen.getByRole("link", { name: "Archive" }).querySelector("svg")).toHaveAttribute("data-testid", "ChevronLeftIcon");
});

test("without a route it is a button that runs its handler", async () => {
  const onClick = vi.fn();
  render(<BackLink onClick={onClick}>חזרה</BackLink>);
  await userEvent.click(screen.getByRole("button", { name: "חזרה" }));
  expect(onClick).toHaveBeenCalledTimes(1);
});
