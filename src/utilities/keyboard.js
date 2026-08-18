// Reading a keyboard shortcut off a KeyboardEvent.
//
// This exists because of one bug, and the bug is worth stating in full because
// it is invisible in every test and in most of the world:
//
//   `event.key` is the CHARACTER the current layout produces. With a Hebrew
//   keyboard the S key reports "ד", so a handler matching `key === "s"` never
//   ran — while the browser's own Ctrl+S accelerator, which matches the
//   physical key whatever the layout, went ahead and opened "save page as".
//   In an application written entirely in Hebrew, the shortcut therefore
//   failed for the ordinary case and worked only for someone who had switched
//   to English first.
//
// `event.code` is the physical key and has no such problem, so it comes first.
// `key` stays as a fallback for the layouts that remap the physical keys
// themselves — Dvorak, Colemak — where the letter the user pressed is the
// letter they meant.

/** Ctrl+S on Windows and Linux, Cmd+S on a Mac. */
export const isSaveShortcut = (event) =>
  Boolean(event) &&
  (event.ctrlKey || event.metaKey) &&
  !event.altKey &&
  (event.code === "KeyS" || event.key?.toLowerCase() === "s");
