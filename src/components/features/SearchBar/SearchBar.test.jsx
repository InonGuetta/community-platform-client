// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { buildTheme } from "../../../theme/theme";
import SearchBar from "./SearchBar";

// The search field of Redesign v4 (component 8, D-29). The name it gives a
// screen reader is pinned in a11yReview.test.jsx.

test("reports every keystroke and shows the placeholder before focus", async () => {
  const onSearch = vi.fn();
  render(
    <ThemeProvider theme={buildTheme("light")}>
      <SearchBar onSearch={onSearch} placeholder="חיפוש..." />
    </ThemeProvider>
  );
  const box = screen.getByRole("textbox", { name: "חיפוש" });
  expect(box).toHaveAttribute("placeholder", "חיפוש...");
  await userEvent.type(box, "תורה");
  expect(onSearch).toHaveBeenLastCalledWith("תורה");
  expect(box).toHaveValue("תורה");
});

// The pill itself is not asserted: jsdom resolves competing rules by order,
// not specificity, so a computed radius here says nothing about a browser.
test("the magnifier is a start adornment", () => {
  const { container } = render(
    <ThemeProvider theme={buildTheme("light")}>
      <SearchBar onSearch={() => {}} />
    </ThemeProvider>
  );
  const root = container.querySelector(".MuiOutlinedInput-root");
  expect(root.classList.contains("MuiInputBase-adornedStart")).toBe(true);
  expect(screen.getByTestId("SearchIcon")).toBeInTheDocument();
});
