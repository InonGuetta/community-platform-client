import { CONTENT_WIDTH } from "../../theme/tokens";

// How wide each page's content may grow (design/REDESIGN_V4.md, decision 7 and
// part B "Layout"; D-13): 1180 for a grid of items, two columns or a wide table;
// 1080 for a single column; "full" for the live session room, whose video takes
// the whole screen. App reads it once for the route, so every page has its
// width without wrapping itself.
//
// Matched by the path's first segment, which is all the table needs: every
// page under one segment has the same width, except /sessions/:id.
const NARROW = new Set(["ask", "downloads", "my-courses", "sessions", "donate", "courses", "profile",
  "sign-in", "sign-up", "forgot-password", "reset-password", "verify-email", "unsubscribe"]);

export const pageWidthFor = (pathname) => {
  const [, first = "", second] = pathname.split("/");
  if (first === "sessions" && second) return "full";
  return NARROW.has(first) ? "narrow" : "wide";
};

// The px a width stands for; `null` for full.
export const maxWidthOf = (width) => (width === "full" ? null : CONTENT_WIDTH[width] ?? CONTENT_WIDTH.wide);
