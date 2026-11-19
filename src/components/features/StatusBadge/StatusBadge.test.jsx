// @vitest-environment jsdom
import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { buildTheme } from "../../../theme/theme";
import StatusBadge from "./StatusBadge";

const inTheme = (ui, mode = "light") => render(<ThemeProvider theme={buildTheme(mode)}>{ui}</ThemeProvider>);

test("shows its words and carries its tone", () => {
  inTheme(<StatusBadge tone="success">פעיל</StatusBadge>);
  expect(screen.getByText("פעיל")).toHaveAttribute("data-tone", "success");
});

test("is drawn in the tone's colours from the theme", () => {
  inTheme(<StatusBadge tone="warning">טיוטה</StatusBadge>);
  const style = getComputedStyle(screen.getByText("טיוטה"));
  expect(style.backgroundColor).toBe("rgb(255, 251, 235)");
  expect(style.color).toBe("rgb(180, 83, 9)");
});

test("an unknown tone falls back to neutral", () => {
  inTheme(<StatusBadge tone="purple">תלמיד</StatusBadge>);
  expect(screen.getByText("תלמיד")).toHaveAttribute("data-tone", "neutral");
});
