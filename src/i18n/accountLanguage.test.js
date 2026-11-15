import { test, expect } from "vitest";
import { reconcileAccountLanguage } from "./accountLanguage";

test("already in step: nothing to do", () => {
  expect(reconcileAccountLanguage({ account: "en", current: "en", chosen: "en" })).toBeNull();
  expect(reconcileAccountLanguage({ account: "he", current: "he", chosen: null })).toBeNull();
});

test("the account's language wins on a browser that chose nothing", () => {
  expect(reconcileAccountLanguage({ account: "fr", current: "he", chosen: null })).toEqual({ adopt: "fr" });
});

test("the account's language wins over this browser's choice when the account chose too", () => {
  expect(reconcileAccountLanguage({ account: "es", current: "en", chosen: "en" })).toEqual({ adopt: "es" });
});

test("a choice made before signing in is kept, and saved to an account still on Hebrew", () => {
  expect(reconcileAccountLanguage({ account: "he", current: "fr", chosen: "fr" })).toEqual({ save: "fr" });
});

test("a guessed language (nothing chosen) does not overwrite the account", () => {
  expect(reconcileAccountLanguage({ account: "he", current: "en", chosen: null })).toEqual({ adopt: "he" });
});

test("no account, or a code we do not have, does nothing", () => {
  expect(reconcileAccountLanguage({ account: undefined, current: "he", chosen: "fr" })).toBeNull();
  expect(reconcileAccountLanguage({ account: "de", current: "he", chosen: null })).toBeNull();
  expect(reconcileAccountLanguage({ account: "he", current: "he", chosen: "de" })).toBeNull();
});
