import { test, expect } from "vitest";
import i18n from "../../i18n/i18n";
import { navConfigFor, DOCK_ITEMS } from "./navConfig";
import { PERSONAL_SHELVES } from "./personalShelves";

// navConfig's items and the personal shelves carry keys into "nav" rather than
// words. A key with a typo renders as the key itself — "links.archvie" in the
// header — with no error anywhere, so every one is checked against the Hebrew.

const exists = (key) => i18n.exists(key, { ns: "nav", lng: "he" });

test("every item of every role names a key that exists", () => {
  const keys = new Set(
    ["student", "lecturer", "admin"].flatMap((role) => {
      const { personal, primary, admin } = navConfigFor(role);
      return [...personal, ...primary, ...admin].map((item) => item.labelKey);
    })
  );
  for (const item of DOCK_ITEMS) keys.add(item.shortKey);
  expect(keys.size).toBeGreaterThan(5);
  for (const key of keys) expect(exists(key), key).toBe(true);
});

test("every shelf's label and empty messages name keys that exist", () => {
  const keys = PERSONAL_SHELVES.flatMap((shelf) =>
    [shelf.labelKey, shelf.collection?.emptyKey, shelf.collection?.emptyFilteredKey].filter(Boolean)
  );
  expect(keys.length).toBeGreaterThan(5);
  for (const key of keys) expect(exists(key), key).toBe(true);
});
