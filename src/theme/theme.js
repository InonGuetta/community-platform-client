import { createTheme } from "@mui/material/styles";

// Single source of truth for the palette in each mode. The light values are the
// exact ones the app already shipped, so light mode is unchanged; dark adds a
// lighter brand tone and dark slate surfaces for readable contrast.
const PALETTES = {
  light: {
    mode: "light",
    primary: { main: "#1a4a66" },   // navy — logo, headings, nav links
    secondary: { main: "#17a2c4" },  // teal — upload button, accents
    background: { default: "#f3f5f7" },
  },
  dark: {
    mode: "dark",
    primary: { main: "#5fb0cf" },   // lightened navy/teal for contrast on dark
    secondary: { main: "#29b6d8" },
    background: { default: "#0f1417", paper: "#1a2228" },
  },
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

// The app is Hebrew-first, so the document flows right-to-left (paired with
// dir="rtl" on <html>). Built per mode so the ThemeProvider can swap themes.
export const buildTheme = (mode) => {
  const palette = PALETTES[mode] || PALETTES.light;
  return createTheme({
    direction: "rtl",
    palette,
    components: {
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
          startIcon: { marginLeft: 0, marginRight: 0, marginInlineEnd: 8, marginInlineStart: -4 },
          endIcon: { marginLeft: 0, marginRight: 0, marginInlineStart: 8, marginInlineEnd: -4 },
        },
      },
      MuiCssBaseline: { styleOverrides: scrollbarStyles(palette.mode === "dark") },
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
      MuiPopover: { defaultProps: { disableScrollLock: true } },
      MuiMenu: { defaultProps: { disableScrollLock: true } },
    },
  });
};
