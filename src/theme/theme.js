import { createTheme } from "@mui/material/styles";
import { COLORS, badgeTones, RADIUS, SHADOW, MOTION, FONT_TEXT, FONT_DISPLAY } from "./tokens";

// Redesign v4 (design/REDESIGN_V4.md, parts B and C). The values live in
// tokens.js; this file turns them into a MUI theme, so that every screen gets
// the new colours, type, buttons, fields, tabs, switches and cards from the
// theme alone, before any page is restyled.

const paletteFor = (mode) => {
  const c = COLORS[mode] || COLORS.light;
  const isDark = c === COLORS.dark;
  return {
    mode: isDark ? "dark" : "light",
    primary: { main: c.accent, dark: c.accentHover, contrastText: "#fff" },
    // The old teal's place (a highlighted transcript line, an outline around
    // what is chosen) taken by the brand's second tone. `light` is left to MUI
    // to derive, because callers pair it with contrastText.
    secondary: { main: c.accentAlt, contrastText: "#fff" },
    // Purple — the user's OWN material: the save control and the personal
    // shelves it fills (D-25 keeps it in both modes).
    personal: { main: isDark ? "#b39ddb" : "#7e57c2" },
    error: { main: c.danger, dark: c.error.fg, light: c.error.bg },
    success: { main: c.success.fg, light: c.success.bg },
    warning: { main: c.warning.fg, light: c.warning.bg },
    background: { default: c.bg, paper: c.paper },
    text: { primary: c.ink, secondary: c.mute },
    divider: c.line,
    // The tokens MUI has no slot for, readable in sx as "surface.fill" etc.
    surface: {
      fill: c.fill,
      fillHover: c.fillHover,
      fill2: c.fill2,
      line: c.line,
      lineStrong: c.lineStrong,
      ink: c.ink,
      ink2: c.ink2,
      placeholder: c.placeholder,
      raised: c.raised,
      accentSoft: c.accentSoft,
      danger: c.danger,
      draft: c.draft,
      cue: c.cue,
      wash: c.wash,
      glass: c.glass,
    },
    badge: badgeTones(c),
  };
};

// Scrollbars do NOT follow a MUI palette — they are painted by the browser from
// the OS theme, so every scrolling pane in the app kept a bright white trough
// with grey arrow buttons while the rest of the page went dark. On the floating
// source window and the bookmarks list that trough runs the full height of the
// panel, which made it the loudest thing on a dark screen.
//
// Tinted from the mode rather than from a palette token, and applied globally
// through CssBaseline so a pane added later cannot forget to opt in. Both
// syntaxes are given: `scrollbar-color` is the standard one (Firefox), the
// ::-webkit rules are what Chrome and Edge actually read.
const scrollbarStyles = (isDark) => {
  const thumb = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";
  const thumbHover = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.35)";
  return {
    "*": { scrollbarWidth: "thin", scrollbarColor: `${thumb} transparent` },
    // The pointing hand over the whole scrollbar, thumb and trough alike — the
    // bar is something you act on, and the default arrow says otherwise.
    //
    // Worth knowing: a scrollbar is a native widget, not page content, and
    // `cursor` on these pseudo-elements is honoured by Chromium but is not a
    // guarantee across every engine. It costs nothing where it is ignored.
    "*::-webkit-scrollbar": { width: 10, height: 10, cursor: "pointer" },
    "*::-webkit-scrollbar-track": { backgroundColor: "transparent", cursor: "pointer" },
    "*::-webkit-scrollbar-thumb": {
      backgroundColor: thumb,
      borderRadius: 8,
      cursor: "pointer",
      // A transparent border clipped to the content box insets the thumb, so it
      // reads as a floating pill rather than a bar wedged against the edge.
      border: "2px solid transparent",
      backgroundClip: "content-box",
    },
    "*::-webkit-scrollbar-thumb:hover": { backgroundColor: thumbHover, cursor: "pointer" },
    // The little step arrows at each end are a Windows-classic leftover and are
    // the part that stays stubbornly light. Nothing else in the app has them.
    "*::-webkit-scrollbar-button": { display: "none" },
    "*::-webkit-scrollbar-corner": { backgroundColor: "transparent" },
  };
};

// The keyboard's place, drawn the same on everything that takes focus
// (part A, "נגישות"): `outline: 2px solid accent; outline-offset: 3px`.
const focusRing = (c, offset = 3) => ({ outline: `2px solid ${c.accent}`, outlineOffset: offset });

// Part A, "נגישות"; D-48: under `prefers-reduced-motion` nothing slides,
// scales or pops — the page transition, the cover lift, the dock, the heart.
// !important, because MUI's own transitions are inline styles.
const reducedMotion = {
  "@media (prefers-reduced-motion: reduce)": {
    "*, *::before, *::after": {
      animationDuration: "0.01ms !important",
      animationIterationCount: "1 !important",
      transitionDuration: "0.01ms !important",
      scrollBehavior: "auto !important",
    },
  },
};

// 25 elevations, as MUI wants, mapped onto the few shadows the design has:
// 1 a card, 2 a raised chip, 8 (every Menu and Popover) a dropdown, 24 (a
// Dialog) the heavy one. The rest step between them.
const shadowScale = () => {
  const s = ["none", SHADOW.card, SHADOW.sm];
  for (let i = 3; i <= 5; i += 1) s.push("0 4px 12px -4px rgba(0,0,0,.15)");
  for (let i = 6; i <= 7; i += 1) s.push("0 10px 30px -10px rgba(0,0,0,.2)");
  for (let i = 8; i <= 15; i += 1) s.push(SHADOW.menu);
  for (let i = 16; i <= 23; i += 1) s.push(SHADOW.player);
  s.push(SHADOW.dialog);
  return s;
};

const displayType = { fontFamily: FONT_DISPLAY, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.02 };

// The direction follows the interface's language (src/i18n), paired with
// <html dir>, which i18n.js keeps in step. Hebrew-first, so rtl unless told
// otherwise. Built per mode and direction so the ThemeProvider can swap themes.
export const buildTheme = (mode, direction = "rtl") => {
  const palette = paletteFor(mode);
  const c = COLORS[palette.mode];
  const isDark = palette.mode === "dark";
  const rtl = direction === "rtl";

  // The app runs without the stylis flip plugin (see MuiButton below), so a
  // MUI style written with a physical side is wrong in rtl. Where a component
  // positions something by `left`/`right` and a logical property cannot be
  // mixed in safely, the side is chosen here from the direction: S is the side
  // a line starts on, E the side it ends on.
  const S = rtl ? "Right" : "Left";
  const E = rtl ? "Left" : "Right";
  const sideS = S.toLowerCase();
  const sideE = E.toLowerCase();

  // A field's padding, with the side next to an adornment cleared (MUI clears
  // `paddingLeft` for a start adornment, which in rtl is the END of the line).
  const inputPad = (v, h) => ({
    padding: `${v}px ${h}px`,
    "&.MuiInputBase-inputAdornedStart": { [`padding${S}`]: 0, [`padding${E}`]: h },
    "&.MuiInputBase-inputAdornedEnd": { [`padding${E}`]: 0, [`padding${S}`]: h },
    "&.MuiInputBase-inputAdornedStart.MuiInputBase-inputAdornedEnd": { paddingLeft: 0, paddingRight: 0 },
  });

  return createTheme({
    direction,
    palette,
    // The spec's main breakpoint is 768 (REDESIGN_V4.md part B, "Layout"), so
    // `md` is 768, not MUI's 900 (D-135; D-68 had kept 900 until 8ב looked).
    breakpoints: { values: { xs: 0, sm: 600, md: 768, lg: 1200, xl: 1536 } },
    shadows: shadowScale(),
    // shape.borderRadius stays MUI's 4: an `sx={{ borderRadius: 2 }}` written
    // anywhere in the app is that multiple of it, and changing the base would
    // silently resize every one of them. The design's radii are named in
    // `tokens.radius` and given in px.
    tokens: { radius: RADIUS, shadow: SHADOW, motion: MOTION, colors: c },
    typography: {
      fontFamily: FONT_TEXT,
      // Display headings (part B): Heebo 800, tight. No size — each use sets
      // its own (44/64 a page, 44/80 the archive, 26/32 an empty state…).
      display: displayType,
      // The small line over a heading and the meta of an item.
      kicker: { fontFamily: FONT_TEXT, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.4 },
      h1: displayType,
      h2: displayType,
      h3: { ...displayType, lineHeight: 1.1 },
      h4: { fontWeight: 800, letterSpacing: "-0.02em" },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { textTransform: "none", fontWeight: 700 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ...scrollbarStyles(isDark),
          body: { backgroundColor: c.bg, color: c.ink },
          // Anything focusable that is not a MUI control (a plain link, a
          // div with tabIndex) gets the same ring as the controls.
          "a:focus-visible, [tabindex]:focus-visible": focusRing(c),
          "::selection": { backgroundColor: isDark ? "rgba(99,102,241,.35)" : "#e0e7ff" },
          ...reducedMotion,
        },
      },
      MuiTypography: {
        defaultProps: { variantMapping: { display: "h2", kicker: "p" } },
      },
      // No ripple anywhere: the design presses (scale .95) and rings on focus.
      MuiButtonBase: {
        defaultProps: { disableRipple: true },
        styleOverrides: { root: { "&.Mui-focusVisible": focusRing(c) } },
      },
      // Component 6. Every button a pill, 700, 15px, 44 high.
      //
      // A button's icon sits BESIDE its label, not on top of it.
      //
      // MUI spaces the icon with physical margins — startIcon carries
      // `margin-right: 8; margin-left: -4`, written for a left-to-right button
      // where the icon leads on the left: 8px of air before the label, and -4px
      // pulling the icon back toward the button's edge.
      //
      // This app runs right-to-left (dir="rtl" on <html>) and deliberately
      // WITHOUT the stylis flip plugin, so those two values are not mirrored.
      // The icon is laid out on the right, where the meaning of each margin is
      // reversed: the -4px now pulls it INTO the first letter of the label and
      // the 8px pushes it away from the edge it should be sitting against. That
      // is the save button's icon printed over the word "שמירה", and the "+"
      // crowding "הערה חדשה".
      //
      // The fix is the properties MUI meant rather than different numbers:
      // inline-start/-end ARE the physical sides, chosen per direction, so one
      // declaration is correct in both. The physical pair is zeroed first
      // because MUI still sets it (and sets `margin-left: -2` again for small
      // buttons), and a stale physical margin would win on the side it names.
      //
      // Set on the theme rather than on the button that was noticed: every
      // button in the app with an icon has this, and fixing them one at a time
      // as each is spotted is how they end up disagreeing.
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: RADIUS.pill,
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.3,
            minHeight: 44,
            padding: "8px 24px",
            transition: "background-color .2s, color .2s, border-color .2s, transform .15s",
            "&:active": { transform: MOTION.press },
          },
          sizeSmall: { minHeight: 36, padding: "6px 16px", fontSize: 13 },
          sizeLarge: { minHeight: 52, padding: "10px 28px", fontSize: 16 },
          text: { padding: "8px 16px" },
          startIcon: { marginLeft: 0, marginRight: 0, marginInlineEnd: 8, marginInlineStart: -4 },
          endIcon: { marginLeft: 0, marginRight: 0, marginInlineStart: 8, marginInlineEnd: -4 },
        },
        variants: [
          // `outline` in the spec: a neutral border, not a blue one. Only the
          // default colour — an outlined error button keeps its red.
          {
            props: { variant: "outlined", color: "primary" },
            style: {
              borderColor: c.lineStrong,
              color: c.ink,
              "&:hover": { borderColor: c.lineStrong, backgroundColor: c.fill2 },
            },
          },
          // The common secondary button.
          {
            props: { variant: "soft" },
            style: {
              backgroundColor: c.fill,
              color: c.ink,
              "&:hover": { backgroundColor: c.fillHover },
              "&.Mui-disabled": { backgroundColor: c.fill, color: palette.mode === "dark" ? "rgba(255,255,255,.3)" : "rgba(0,0,0,.26)" },
            },
          },
          {
            props: { variant: "dark" },
            style: {
              backgroundColor: c.ink,
              color: c.bg,
              "&:hover": { backgroundColor: isDark ? "#FFFFFF" : "#000000" },
              "&.Mui-disabled": { opacity: 0.5, color: c.bg },
            },
          },
          // "אהבתי" when on.
          {
            props: { variant: "tinted-success" },
            style: {
              backgroundColor: c.success.bg,
              color: c.success.fg,
              "&:hover": { backgroundColor: c.success.hover },
              "&.Mui-disabled": { opacity: 0.5, color: c.success.fg },
            },
          },
        ],
      },
      // A round icon button, greyed on hover.
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: "background-color .2s, transform .15s",
            "&:active": { transform: MOTION.press },
          },
        },
        variants: [{ props: { color: "default" }, style: { "&:hover": { backgroundColor: c.fill } } }],
      },
      MuiLink: {
        defaultProps: { underline: "hover" },
        styleOverrides: { root: { fontWeight: 600 } },
      },

      // Component 10.
      MuiTabs: {
        defaultProps: { variant: "scrollable", scrollButtons: false },
        styleOverrides: {
          root: { minHeight: 48, borderBottom: `1px solid ${c.line}` },
          indicator: { height: 2, backgroundColor: c.accent },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 48,
            minWidth: 0,
            padding: "0 16px",
            fontSize: 15,
            fontWeight: 700,
            textTransform: "none",
            color: c.mute,
            "&.Mui-selected": { color: c.ink },
            // Inside the scroller, which clips: the ring goes inward.
            "&.Mui-focusVisible": focusRing(c, -3),
          },
        },
      },

      // Component 11: iOS. 42×26 track, a 20px thumb that travels 16px. The
      // thumb starts on the side a line starts on, as the mockup's does
      // (`right: 3px` in rtl) — MUI's own `left: 0` is physical.
      MuiSwitch: {
        styleOverrides: {
          root: { width: 42, height: 26, padding: 0, margin: 6, overflow: "visible" },
          switchBase: {
            padding: 0,
            margin: 3,
            [sideS]: 0,
            [sideE]: "auto",
            transitionDuration: "200ms",
            "&.Mui-checked": {
              transform: `translateX(${rtl ? -16 : 16}px)`,
              color: "#fff",
              "& + .MuiSwitch-track": { backgroundColor: c.accent, opacity: 1 },
            },
            "&.Mui-disabled + .MuiSwitch-track": { opacity: 0.5 },
            "&.Mui-disabled .MuiSwitch-thumb": { color: isDark ? "#9CA3AF" : "#fff" },
            "&.Mui-focusVisible": { outline: "none" },
            "&.Mui-focusVisible + .MuiSwitch-track": focusRing(c),
            "&:hover": { backgroundColor: "transparent" },
          },
          thumb: { width: 20, height: 20, boxShadow: "0 1px 3px rgba(0,0,0,.3)", color: "#fff" },
          track: { borderRadius: 13, backgroundColor: c.lineStrong, opacity: 1, transition: "background-color .2s" },
          sizeSmall: {
            width: 34,
            height: 20,
            "& .MuiSwitch-thumb": { width: 14, height: 14 },
            "& .MuiSwitch-switchBase.Mui-checked": { transform: `translateX(${rtl ? -14 : 14}px)` },
          },
        },
      },

      // Component 9: the filter chip. Grey pill, 36 high; a small chip (a tag)
      // is a badge's size. The icon's margins are logical, for the same reason
      // as the button's.
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: RADIUS.pill, height: 36, fontSize: 14, fontWeight: 600 },
          label: { paddingInline: 16 },
          sizeSmall: { height: 28, fontSize: 12, fontWeight: 700, "& .MuiChip-label": { paddingInline: 10 } },
          outlined: { borderColor: c.lineStrong },
          icon: { marginLeft: 0, marginRight: 0, marginInlineStart: 8, marginInlineEnd: -6 },
          deleteIcon: { marginLeft: 0, marginRight: 0, marginInlineStart: -6, marginInlineEnd: 6 },
          avatar: { marginLeft: 0, marginRight: 0, marginInlineStart: 6, marginInlineEnd: -6 },
        },
        variants: [
          {
            props: { variant: "filled", color: "default" },
            style: {
              backgroundColor: c.fill,
              color: c.ink,
              "&.MuiChip-clickable:hover": { backgroundColor: c.fillHover },
            },
          },
        ],
      },

      // Component 12. A Paper at the default elevation is a section card:
      // white, a 1px line, radius 24, the card shadow. Other elevations
      // (menus, dialogs, the app bar) keep their own shape.
      MuiPaper: {
        styleOverrides: {
          // No dark-mode overlay gradient: the dark paper colour is the token.
          root: { backgroundImage: "none" },
          // Plain, not `&.MuiPaper-rounded`, so a caller's sx radius and a
          // subclass (an accordion, an autocomplete list) still win over it.
          elevation1: ({ ownerState }) => ({
            border: `1px solid ${c.line}`,
            boxShadow: SHADOW.card,
            ...(ownerState.square ? {} : { borderRadius: RADIUS.card }),
          }),
          outlined: { borderColor: c.line },
        },
      },
      MuiCard: {
        styleOverrides: { root: { borderRadius: RADIUS.card, border: `1px solid ${c.line}`, boxShadow: SHADOW.card } },
      },
      MuiCardContent: {
        styleOverrides: { root: { padding: 24, "&:last-child": { paddingBottom: 24 } } },
      },
      // An accordion keeps its own radius (only the first and last of a stack
      // are rounded); the hairline it draws between stacked panels goes, now
      // that each panel has a border.
      MuiAccordion: {
        styleOverrides: { root: { "&::before": { display: "none" } } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: RADIUS.card, border: "none" } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: RADIUS.field } },
      },

      // Component 2's look, for every menu: radius 16, a line, padding 8.
      //
      // A dropdown does not freeze the page under it.
      //
      // Every MUI menu is a Modal, and a Modal locks body scroll by default.
      // That is right for a dialog — the dialog IS the task, and scrolling the
      // page behind it is not part of it — and wrong for a menu: with the nav's
      // "תוכן אישי" panel open, the wheel did nothing at all, which reads as the
      // site having hung rather than as a menu waiting for a choice. The menus
      // still close the way they always did, on a choice or a click away.
      //
      // Set on the THEME rather than on the one menu that was noticed: the app
      // has a dozen of these (download, save, player settings, the card menus),
      // they all inherit the same modal behaviour, and fixing them one at a time
      // as each is noticed is how they end up disagreeing. Dialogs and drawers
      // are untouched — they are not Popovers.
      MuiPopover: {
        defaultProps: { disableScrollLock: true },
        styleOverrides: { paper: { borderRadius: RADIUS.menu } },
      },
      MuiMenu: {
        defaultProps: { disableScrollLock: true },
        styleOverrides: {
          paper: { borderRadius: RADIUS.menu, border: `1px solid ${c.line}`, boxShadow: SHADOW.menu, padding: 8 },
          list: { padding: 0 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 14,
            "&:hover": { backgroundColor: c.fill2 },
            "&.Mui-selected": { backgroundColor: c.accentSoft },
            "&.Mui-selected:hover": { backgroundColor: c.accentSoft },
            "&.Mui-focusVisible": { ...focusRing(c, -2), backgroundColor: c.fill2 },
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: { paper: { borderRadius: RADIUS.menu, border: `1px solid ${c.line}`, boxShadow: SHADOW.menu } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: "rgba(30,30,32,.82)",
            backdropFilter: "blur(10px)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            padding: "5px 11px",
            borderRadius: 8,
          },
          arrow: { color: "rgba(30,30,32,.82)" },
        },
      },

      // Component 7, through the theme (D-28): every outlined field gets the
      // label above it, not floating, and a filled grey body that turns white
      // with an accent ring on focus. The <label for> link is untouched — the
      // label only stops being absolutely positioned.
      //
      // `shrink` by default so the outlined border never cuts a notch for a
      // label that no longer sits on it, and so a placeholder is shown before
      // focus (MUI hides it under an unshrunk label).
      MuiInputLabel: {
        defaultProps: { shrink: true },
        styleOverrides: {
          outlined: {
            position: "relative",
            transform: "none",
            maxWidth: "100%",
            marginBottom: 6,
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.4,
            color: c.ink2,
            textAlign: "start",
            pointerEvents: "auto",
            "&.Mui-focused": { color: c.ink2 },
            "&.Mui-error": { color: palette.error.main },
            "&.Mui-disabled": { color: c.mute },
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          input: {
            "&::placeholder": { color: c.placeholder, opacity: 1 },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.field,
            backgroundColor: c.fill2,
            transition: "background-color .2s, box-shadow .2s",
            [`&:hover .MuiOutlinedInput-notchedOutline`]: { borderColor: "transparent" },
            "&.Mui-focused": {
              backgroundColor: c.paper,
              boxShadow: `0 0 0 4px ${isDark ? "rgba(99,102,241,.25)" : "rgba(79,70,229,.1)"}`,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: c.accent, borderWidth: 1 },
            "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: palette.error.main },
            "&.Mui-disabled": { opacity: 0.6 },
            "&.MuiInputBase-adornedStart": { paddingLeft: 0, paddingRight: 0, [`padding${S}`]: 14 },
            "&.MuiInputBase-adornedEnd": { paddingLeft: 0, paddingRight: 0, [`padding${E}`]: 14 },
            "&.MuiInputBase-adornedStart.MuiInputBase-adornedEnd": { paddingLeft: 14, paddingRight: 14 },
            "&.MuiInputBase-multiline": { padding: "12.5px 16px" },
            "&.MuiInputBase-multiline.MuiInputBase-sizeSmall": { padding: "8.5px 14px" },
          },
          // 48 high at 16px text (23px line + 2 × 12.5); a small one 40.
          input: {
            ...inputPad(12.5, 16),
            "&.MuiInputBase-inputSizeSmall": inputPad(8.5, 14),
            "&.MuiInputBase-inputMultiline": { padding: 0 },
          },
          notchedOutline: {
            top: 0,
            borderColor: "transparent",
            "& legend": { display: "none" },
          },
        },
      },
      // The chevron at the end of the line, in both directions.
      MuiSelect: {
        styleOverrides: {
          select: { "&&&": { [`padding${S}`]: 16, [`padding${E}`]: 40 } },
          icon: { [sideS]: "auto", [sideE]: 12, color: c.mute },
        },
      },
      MuiInputAdornment: {
        styleOverrides: {
          positionStart: { marginLeft: 0, marginRight: 0, marginInlineEnd: 8 },
          positionEnd: { marginLeft: 0, marginRight: 0, marginInlineStart: 8 },
        },
      },
    },
  });
};
