import { test, expect } from "vitest";
import { LANGUAGES, LANGUAGE_CODES, DEFAULT_LANGUAGE, directionOf, isSupportedLanguage, matchBrowserLanguage } from "./languages";

test("the five interface languages, Hebrew first and the default", () => {
  expect(LANGUAGE_CODES).toEqual(["he", "yi", "en", "fr", "es"]);
  expect(DEFAULT_LANGUAGE).toBe("he");
});

test("Hebrew and Yiddish run right to left, the others left to right", () => {
  expect(LANGUAGES.filter((l) => l.dir === "rtl").map((l) => l.code)).toEqual(["he", "yi"]);
  expect(directionOf("en")).toBe("ltr");
  expect(directionOf("yi")).toBe("rtl");
});

test("an unknown language takes the default's direction", () => {
  expect(directionOf("de")).toBe("rtl");
  expect(directionOf(undefined)).toBe("rtl");
});

test("every language is named in itself", () => {
  expect(LANGUAGES.map((l) => l.name)).toEqual(["עברית", "ייִדיש", "English", "Français", "Español"]);
});

test("isSupportedLanguage takes only our codes", () => {
  expect(isSupportedLanguage("fr")).toBe(true);
  expect(isSupportedLanguage("FR")).toBe(false);
  expect(isSupportedLanguage(null)).toBe(false);
});

test("the browser's first language we have wins, by its primary subtag", () => {
  expect(matchBrowserLanguage(["de-DE", "fr-CA", "en"])).toBe("fr");
  expect(matchBrowserLanguage(["EN-us"])).toBe("en");
});

test("the retired codes browsers still send are understood", () => {
  expect(matchBrowserLanguage(["iw-IL"])).toBe("he");
  expect(matchBrowserLanguage(["ji"])).toBe("yi");
});

test("nothing we have, or nothing at all, is null", () => {
  expect(matchBrowserLanguage(["de", "ru"])).toBeNull();
  expect(matchBrowserLanguage([])).toBeNull();
  expect(matchBrowserLanguage([undefined, 3])).toBeNull();
});
