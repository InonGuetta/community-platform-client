// @vitest-environment jsdom
import { test, expect, describe } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import { buildTheme } from "../../../theme/theme";
import { COLORS, TYPE_ACCENT } from "../../../theme/tokens";
import TypeAccent from "./TypeAccent";
import { accentKeyFor } from "./accentForType";

// The content-type accent (D-146): what is wrapped is drawn in the type's
// colour, and a recording keeps the site's accent untouched.

// What the wrapped subtree sees, handed out through a callback (a component
// may not write to a variable outside itself).
let seen;
const look = (theme) => { seen = theme; };
const Probe = () => {
  const theme = useTheme();
  look(theme);
  return <span data-testid="probe">{theme.palette.primary.main}</span>;
};

const renderIn = (type, mode = "light", direction = "rtl") => {
  const outer = buildTheme(mode, direction);
  render(
    <ThemeProvider theme={outer}>
      <TypeAccent type={type}><Probe /></TypeAccent>
    </ThemeProvider>
  );
  return outer;
};

describe("the accent per type", () => {
  test("a video is orange", () => {
    renderIn("video");
    expect(screen.getByTestId("probe").textContent).toBe(TYPE_ACCENT.video.light.main);
  });

  test("a book is purple", () => {
    renderIn("text");
    expect(screen.getByTestId("probe").textContent).toBe(TYPE_ACCENT.text.light.main);
  });

  test("a recording keeps the very theme it was given", () => {
    const outer = renderIn("audio");
    expect(seen.palette).toBe(outer.palette);
    expect(screen.getByTestId("probe").textContent).toBe(COLORS.light.accent);
  });

  test("the dark mode takes the dark shade, with dark text on it", () => {
    renderIn("video", "dark");
    expect(seen.palette.primary.main).toBe(TYPE_ACCENT.video.dark.main);
    expect(seen.palette.primary.contrastText).toBe(TYPE_ACCENT.video.dark.contrastText);
    expect(seen.palette.mode).toBe("dark");
  });

  test("keeps the direction and swaps the soft surface and the badge with it", () => {
    renderIn("text", "light", "ltr");
    expect(seen.direction).toBe("ltr");
    expect(seen.palette.surface.accentSoft).toBe(TYPE_ACCENT.text.light.soft);
    expect(seen.palette.badge.indigo.fg).toBe(TYPE_ACCENT.text.light.main);
  });

  test("an unknown type is a recording's", () => {
    expect(accentKeyFor(undefined)).toBe("audio");
    expect(accentKeyFor("audio")).toBe("audio");
  });
});

// WCAG relative luminance, for the contrast the shades were chosen by.
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test.each(["video", "text"])("%s: the text on a contained button reads at 4.5:1 or better", (type) => {
  for (const mode of ["light", "dark"]) {
    const { main, contrastText } = TYPE_ACCENT[type][mode];
    expect(contrast(main, contrastText)).toBeGreaterThanOrEqual(4.5);
  }
});
