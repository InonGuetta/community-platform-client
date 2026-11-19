import { test, expect } from "vitest";
import { buildTheme } from "./theme";
import { COLORS, FONT_TEXT, FONT_DISPLAY } from "./tokens";

// The Redesign v4 tokens reach MUI where the screens read them (design/REDESIGN_V4.md,
// part B). A value here is the spec's; if one changes, the spec changed first.

test("light mode carries the light tokens", () => {
  const { palette } = buildTheme("light");
  expect(palette.mode).toBe("light");
  expect(palette.primary.main).toBe("#4f46e5");
  expect(palette.primary.dark).toBe("#4338ca");
  expect(palette.background.default).toBe("#FBFBFD");
  expect(palette.background.paper).toBe("#FFFFFF");
  expect(palette.text.primary).toBe("#1d1d1f");
  expect(palette.text.secondary).toBe("#6e6e73");
  expect(palette.divider).toBe("#e8e8ed");
  expect(palette.surface.fill).toBe("#f0f0f5");
  expect(palette.surface.lineStrong).toBe("#d2d2d7");
  expect(palette.error.main).toBe("#e11d48");
  expect(palette.success).toMatchObject({ main: "#047857", light: "#ecfdf5" });
  expect(palette.warning).toMatchObject({ main: "#b45309", light: "#fffbeb" });
});

test("dark mode carries the dark tokens, and the save colour survives both (D-25)", () => {
  const dark = buildTheme("dark").palette;
  expect(dark.mode).toBe("dark");
  expect(dark.background.default).toBe("#0B0F19");
  expect(dark.background.paper).toBe("#111827");
  expect(dark.surface.fill).toBe("#1F2937");
  expect(dark.divider).toBe("#1E293B");
  expect(dark.surface.lineStrong).toBe("#334155");
  expect(dark.text.primary).toBe("#F5F5F7");
  expect(dark.text.secondary).toBe("#9CA3AF");
  expect(dark.primary.main).toBe("#6366f1");
  expect(dark.primary.dark).toBe("#818cf8");
  expect(buildTheme("light").palette.personal.main).toBeTruthy();
  expect(dark.personal.main).toBeTruthy();
});

test("an unknown mode falls back to light", () => {
  expect(buildTheme("sepia").palette.background.default).toBe(COLORS.light.bg);
});

test("every badge tone has a background and a text colour in both modes", () => {
  for (const mode of ["light", "dark"]) {
    const { badge } = buildTheme(mode).palette;
    for (const tone of ["indigo", "neutral", "success", "warning", "error"]) {
      expect(badge[tone].bg, `${mode} ${tone}`).toBeTruthy();
      expect(badge[tone].fg, `${mode} ${tone}`).toBeTruthy();
    }
  }
});

test("type: Assistant for text, Heebo 800 for display, and a kicker", () => {
  const { typography } = buildTheme("light");
  expect(typography.fontFamily).toBe(FONT_TEXT);
  expect(FONT_TEXT.startsWith('"Assistant", "Heebo"')).toBe(true);
  expect(typography.display).toMatchObject({ fontFamily: FONT_DISPLAY, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.02 });
  expect(typography.kicker).toMatchObject({ fontSize: 11, fontWeight: 700, textTransform: "uppercase" });
  expect(typography.button.textTransform).toBe("none");
});

test("the direction is the language's, and rtl by default", () => {
  expect(buildTheme("light").direction).toBe("rtl");
  expect(buildTheme("light", "ltr").direction).toBe("ltr");
});

test("buttons: a pill, the soft / dark / tinted-success variants, and a small size", () => {
  const { MuiButton } = buildTheme("light").components;
  expect(MuiButton.styleOverrides.root).toMatchObject({ borderRadius: 999, minHeight: 44, fontWeight: 700, fontSize: 15 });
  expect(MuiButton.styleOverrides.sizeSmall).toMatchObject({ minHeight: 36, fontSize: 13 });
  const variants = MuiButton.variants.map((v) => v.props.variant);
  expect(variants).toEqual(expect.arrayContaining(["soft", "dark", "tinted-success", "outlined"]));
  const soft = MuiButton.variants.find((v) => v.props.variant === "soft").style;
  expect(soft.backgroundColor).toBe("#f0f0f5");
  // The icon margins stay logical, the reason they were put on the theme.
  expect(MuiButton.styleOverrides.startIcon).toMatchObject({ marginInlineEnd: 8, marginInlineStart: -4 });
});

test("the switch's thumb starts where a line starts, and travels toward its end", () => {
  const rtl = buildTheme("light", "rtl").components.MuiSwitch.styleOverrides.switchBase;
  const ltr = buildTheme("light", "ltr").components.MuiSwitch.styleOverrides.switchBase;
  expect(rtl.right).toBe(0);
  expect(rtl["&.Mui-checked"].transform).toBe("translateX(-16px)");
  expect(ltr.left).toBe(0);
  expect(ltr["&.Mui-checked"].transform).toBe("translateX(16px)");
});

test("a Select's chevron sits at the end of the line in both directions", () => {
  expect(buildTheme("light", "rtl").components.MuiSelect.styleOverrides.icon).toMatchObject({ left: 12, right: "auto" });
  expect(buildTheme("light", "ltr").components.MuiSelect.styleOverrides.icon).toMatchObject({ right: 12, left: "auto" });
});

test("menus and popovers still leave the page scrollable", () => {
  const { components } = buildTheme("light");
  expect(components.MuiMenu.defaultProps.disableScrollLock).toBe(true);
  expect(components.MuiPopover.defaultProps.disableScrollLock).toBe(true);
});

test("reduced motion switches the animations off, globally", () => {
  const base = buildTheme("light").components.MuiCssBaseline.styleOverrides;
  const rule = base["@media (prefers-reduced-motion: reduce)"]["*, *::before, *::after"];
  expect(rule.animationDuration).toMatch(/!important/);
  expect(rule.transitionDuration).toMatch(/!important/);
});

test("25 shadows, the menu's at elevation 8", () => {
  const { shadows } = buildTheme("light");
  expect(shadows).toHaveLength(25);
  expect(shadows[0]).toBe("none");
  expect(shadows[8]).toBe("0 20px 50px -12px rgba(0,0,0,.25)");
});
