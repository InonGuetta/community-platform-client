import { useLanguage } from "./useLanguage";

// The physical sides a line of text starts and ends on, for the few MUI APIs
// that take a side by name and do not flip it: a Drawer's `anchor`, a Menu's
// or Popover's anchorOrigin/transformOrigin `horizontal`. (Styles never need
// this — they use logical properties; see LOGICAL_ONLY in eslint.config.js.)
//
// This app runs without the stylis flip plugin, so "right" there means the
// right of the screen in every language: in Hebrew that is where a line
// starts, in English where it ends.
export const sidesOf = (direction) =>
  direction === "rtl" ? { start: "right", end: "left" } : { start: "left", end: "right" };

// A Menu's or Popover's anchorOrigin + transformOrigin: hanging from the
// bottom of its button ("down") or rising from its top ("up"), lined up on
// `side` — usually `start` or `end` from useDirection. One helper, so every
// menu in the app opens the same way in both directions.
export const menuOrigins = (side, grow = "down") =>
  grow === "up"
    ? { anchorOrigin: { vertical: "top", horizontal: side }, transformOrigin: { vertical: "bottom", horizontal: side } }
    : { anchorOrigin: { vertical: "bottom", horizontal: side }, transformOrigin: { vertical: "top", horizontal: side } };

export const useDirection = () => {
  const { direction } = useLanguage();
  return { direction, rtl: direction === "rtl", ...sidesOf(direction) };
};
