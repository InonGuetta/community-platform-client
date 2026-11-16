import { test, expect, describe } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { LANGUAGES, DEFAULT_LANGUAGE } from "../i18n/languages";

// Every language says everything Hebrew says, and nothing else.
//
// Hebrew is the source and the fallback: a key missing from another language
// quietly shows Hebrew in the middle of an English page, which no other test
// sees. A key only the translation has is dead weight that drifts. And a
// {{variable}} spelled differently is a sentence that shows "{{count}}" to the
// reader. So, for each namespace and each language: the same keys (plural
// endings aside, since languages have different plural forms), the same
// variables, and a file for every namespace.
//
// Keys starting "_" at the top of a file are markers, not words (a draft's
// "_draft"), and are ignored.

const LOCALES = new URL("./", import.meta.url);
const read = (lng, file) => JSON.parse(readFileSync(new URL(`${lng}/${file}`, LOCALES), "utf8"));

const flatten = (node, prefix = "", out = {}) => {
  for (const [key, value] of Object.entries(node)) {
    if (!prefix && key.startsWith("_")) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) flatten(value, path, out);
    else out[path] = value;
  }
  return out;
};

const PLURAL = /_(zero|one|two|few|many|other)$/;
const base = (key) => key.replace(PLURAL, "");
const variables = (text) =>
  [...JSON.stringify(text).matchAll(/\{\{\s*(\w+)/g)].map((m) => m[1]).filter((v) => v !== "count").sort().join(",");

const NAMESPACES = readdirSync(new URL(`${DEFAULT_LANGUAGE}/`, LOCALES)).filter((f) => f.endsWith(".json"));
const OTHERS = LANGUAGES.map((l) => l.code).filter((code) => code !== DEFAULT_LANGUAGE);

test("the Hebrew namespaces were found", () => {
  expect(NAMESPACES.length).toBeGreaterThan(20);
  expect(OTHERS).toEqual(["yi", "en", "fr", "es"]);
});

describe.each(OTHERS)("%s", (lng) => {
  test("has a file for every namespace, and no others", () => {
    expect(readdirSync(new URL(`${lng}/`, LOCALES)).filter((f) => f.endsWith(".json")).sort()).toEqual([...NAMESPACES].sort());
  });

  test.each(NAMESPACES)("%s: the same keys and variables as Hebrew", (file) => {
    const he = flatten(read(DEFAULT_LANGUAGE, file));
    const xx = flatten(read(lng, file));
    const heBases = new Set(Object.keys(he).map(base));
    const xxBases = new Set(Object.keys(xx).map(base));

    expect([...heBases].filter((k) => !xxBases.has(k)), "missing in the translation").toEqual([]);
    expect([...xxBases].filter((k) => !heBases.has(k)), "only in the translation").toEqual([]);

    // A plural key needs at least the form every language falls back to.
    for (const key of Object.keys(he).filter((k) => PLURAL.test(k))) {
      expect(Object.hasOwn(xx, `${base(key)}_other`), `${base(key)}_other`).toBe(true);
    }

    for (const key of heBases) {
      const heText = Object.entries(he).filter(([k]) => base(k) === key).map(([, v]) => v);
      const xxText = Object.entries(xx).filter(([k]) => base(k) === key).map(([, v]) => v);
      expect(variables(xxText[xxText.length - 1]), `{{variables}} of ${key}`).toBe(variables(heText[heText.length - 1]));
    }
  });
});
