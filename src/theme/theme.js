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

// The app is Hebrew-first, so the document flows right-to-left (paired with
// dir="rtl" on <html>). Built per mode so the ThemeProvider can swap themes.
export const buildTheme = (mode) =>
  createTheme({
    direction: "rtl",
    palette: PALETTES[mode] || PALETTES.light,
    components: {
      MuiButton: { defaultProps: { disableElevation: true } },
    },
  });
