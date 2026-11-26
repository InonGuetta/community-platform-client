import { useMemo } from "react";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import { buildTheme } from "../../../theme/theme";
import { accentOverrideFor } from "./accentForType";

// Draws what it wraps in the accent of a kind of content (D-146): the lesson
// page's player and tabs card, and the bottom player. The theme is built again
// with the type's colours in the accent's place, in the same mode and
// direction as the one around it — so every button, indicator, chip, link and
// focus ring inside follows, and no component has to know which lesson it is
// in. Whatever is not wrapped (the page's header, the back link, the shell)
// keeps the site's accent.
//
// Audio changes nothing: the children get the very theme they would have.
const TypeAccent = ({ type, children }) => {
  const outer = useTheme();
  const mode = outer.palette.mode;
  const direction = outer.direction;
  const accent = accentOverrideFor(type, mode);
  const theme = useMemo(() => (accent ? buildTheme(mode, direction, accent) : null), [accent, mode, direction]);
  return theme ? <ThemeProvider theme={theme}>{children}</ThemeProvider> : children;
};

export default TypeAccent;
