import { test, expect } from "vitest";
import { reconcileAccountLanguage } from "./accountLanguage";

test("already in step: nothing to do", () => {
  expect(reconcileAccountLanguage({ account: "en", current: "en", guestChoice: null })).toBeNull();
  expect(reconcileAccountLanguage({ account: "he", current: "he", guestChoice: null })).toBeNull();
});

test("the account's language wins when nobody chose before signing in", () => {
  expect(reconcileAccountLanguage({ account: "fr", current: "he", guestChoice: null })).toEqual({ adopt: "fr" });
  expect(reconcileAccountLanguage({ account: "he", current: "en", guestChoice: null })).toEqual({ adopt: "he" });
});

test("a choice made just before signing in is saved to the account — whatever the account held", () => {
  expect(reconcileAccountLanguage({ account: "he", current: "fr", guestChoice: "fr" })).toEqual({ save: "fr" });
  expect(reconcileAccountLanguage({ account: "es", current: "en", guestChoice: "en" })).toEqual({ save: "en" });
});

test("Hebrew is a real choice, not 'never chose': only a guest choice moves it", () => {
  expect(reconcileAccountLanguage({ account: "he", current: "fr", guestChoice: null })).toEqual({ adopt: "he" });
});

test("a guest choice the account already has needs no save", () => {
  expect(reconcileAccountLanguage({ account: "en", current: "en", guestChoice: "en" })).toBeNull();
});

test("no account, or a code we do not have, does nothing", () => {
  expect(reconcileAccountLanguage({ account: undefined, current: "he", guestChoice: "fr" })).toBeNull();
  expect(reconcileAccountLanguage({ account: "de", current: "he", guestChoice: null })).toBeNull();
  expect(reconcileAccountLanguage({ account: "he", current: "he", guestChoice: "de" })).toBeNull();
});
