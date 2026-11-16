import { test, expect } from "vitest";
import i18n from "../../i18n/i18n";
import { getLinksByRole } from "./navbar/navLinks";
import { PERSONAL_SHELVES } from "./personalShelves";

// The bar's links and the personal shelves carry keys into "nav" rather than
// words. A key with a typo renders as the key itself — "links.archvie" on the
// bar — with no error anywhere, so every one is checked against the Hebrew.

const exists = (key) => i18n.exists(key, { ns: "nav", lng: "he" });

test("every link of every role names a key that exists", () => {
  const keys = new Set(["student", "lecturer", "admin"].flatMap((role) => getLinksByRole(role).map((l) => l.labelKey)));
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
