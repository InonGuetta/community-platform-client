import { test, expect, describe } from "vitest";
import { isSaveShortcut } from "./keyboard";

// The Hebrew case is the reason this function exists, so it is the first test.
// The notebook's save shortcut matched on event.key, which is the character the
// LAYOUT produces — so with a Hebrew keyboard it never fired, and the browser's
// own accelerator opened "save page as" instead. Every test in the suite passed
// throughout: jsdom has no keyboard layouts.

const press = (over) => ({ ctrlKey: false, metaKey: false, altKey: false, code: "", key: "", ...over });

describe("the save shortcut", () => {
  test("Ctrl+S on a Hebrew keyboard, where the key reports a Hebrew letter", () => {
    expect(isSaveShortcut(press({ ctrlKey: true, code: "KeyS", key: "ד" }))).toBe(true);
  });

  test("Ctrl+S on an English keyboard", () => {
    expect(isSaveShortcut(press({ ctrlKey: true, code: "KeyS", key: "s" }))).toBe(true);
  });

  test("Cmd+S on a Mac", () => {
    expect(isSaveShortcut(press({ metaKey: true, code: "KeyS", key: "s" }))).toBe(true);
  });

  // A layout that moves the letters themselves — Dvorak puts S on the physical
  // O key — is the case `key` is kept for: there, the letter is what the user
  // pressed and the physical key is not.
  test("a remapped layout, where the letter is what the user meant", () => {
    expect(isSaveShortcut(press({ ctrlKey: true, code: "KeyO", key: "s" }))).toBe(true);
  });

  test("S with no modifier is a letter somebody is typing", () => {
    expect(isSaveShortcut(press({ code: "KeyS", key: "s" }))).toBe(false);
  });

  test("another key with Ctrl held is somebody else's shortcut", () => {
    expect(isSaveShortcut(press({ ctrlKey: true, code: "KeyA", key: "a" }))).toBe(false);
  });

  // Ctrl+Alt+S belongs to the desktop far more often than to a web page, and
  // swallowing it would take it away from whatever owns it.
  test("Ctrl+Alt+S is left alone", () => {
    expect(isSaveShortcut(press({ ctrlKey: true, altKey: true, code: "KeyS", key: "s" }))).toBe(false);
  });

  test("nothing at all is not a shortcut", () => {
    expect(isSaveShortcut(undefined)).toBe(false);
  });
});
