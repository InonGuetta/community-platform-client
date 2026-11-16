import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, directionOf, isSupportedLanguage, matchBrowserLanguage } from "./languages";

// The interface's strings, and the one place the current language is set.
//
// Files: src/locales/<language>/<namespace>.json — one namespace per area of
// the site (common, nav, archive, errors, notifications, …), keys named by
// meaning, never by the Hebrew. Hebrew is bundled, because it is the default
// and the fallback for every key; the other languages are separate chunks,
// fetched the first time someone picks them.
//
// Like utilities/, this folder imports nothing from components/, store/ or
// api/ (imports.test.js), so a helper in utilities/ may word things through it.

const HEBREW = import.meta.glob("../locales/he/*.json", { eager: true, import: "default" });
const OTHERS = import.meta.glob(["../locales/*/*.json", "!../locales/he/*.json"], { import: "default" });

const namespaceOf = (path) => path.match(/\/([^/]+)\.json$/)[1];
const languageOf = (path) => path.match(/\/locales\/([^/]+)\//)[1];

const hebrew = Object.fromEntries(Object.entries(HEBREW).map(([path, strings]) => [namespaceOf(path), strings]));

export const NAMESPACES = Object.keys(hebrew);

const STORAGE_KEY = "language";

// localStorage can throw (blocked site data, an older private mode) and does
// not exist under Node — a preference must never be what stops the app.
const readStoredLanguage = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const storeLanguage = (code) => {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Not saved — the language still applies for this visit.
  }
};

// A returning visitor's choice, else the browser's, else Hebrew.
export const initialLanguage = () => {
  const stored = readStoredLanguage();
  if (isSupportedLanguage(stored)) return stored;
  const browser = typeof navigator === "undefined" ? [] : navigator.languages ?? [navigator.language];
  return matchBrowserLanguage(browser) ?? DEFAULT_LANGUAGE;
};

// <html lang dir> follows the language, so the browser, screen readers and
// every CSS logical property agree with the theme on which way is "start".
const applyToDocument = (code) => {
  if (typeof document === "undefined") return;
  document.documentElement.lang = code;
  document.documentElement.dir = directionOf(code);
};

const loaded = new Set([DEFAULT_LANGUAGE]);

const loadLanguage = async (code) => {
  if (loaded.has(code)) return;
  const files = Object.entries(OTHERS).filter(([path]) => languageOf(path) === code);
  const bundles = await Promise.all(files.map(async ([path, load]) => [namespaceOf(path), await load()]));
  for (const [ns, strings] of bundles) i18next.addResourceBundle(code, ns, strings, true, true);
  loaded.add(code);
};

i18next.use(initReactI18next).init({
  resources: { [DEFAULT_LANGUAGE]: hebrew },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: false,
  ns: NAMESPACES,
  defaultNS: "common",
  // React already escapes what it renders; escaping here too would show
  // "&quot;" in a course title passed as a value.
  interpolation: { escapeValue: false },
  // Hebrew is in the bundle and another language is loaded BEFORE it is
  // switched to, so nothing is ever waiting on a fetch mid-render.
  react: { useSuspense: false },
  initAsync: false,
});

i18next.on("languageChanged", applyToDocument);
applyToDocument(DEFAULT_LANGUAGE);

const switchTo = async (code) => {
  await loadLanguage(code);
  await i18next.changeLanguage(code);
};

// Switches the interface and remembers the language in this browser, so the
// next visit opens in it before anyone has signed in. An unknown code is
// ignored rather than half-applied. Rejects when the language's strings cannot
// be fetched (offline, or a chunk a new deploy replaced) — the caller says so.
//
// Saving it to an ACCOUNT is not done here: src/i18n knows nothing of the
// store. That is chooseLanguage (store), which every switcher calls.
export const changeLanguage = async (code) => {
  if (!isSupportedLanguage(code)) return;
  await switchTo(code);
  storeLanguage(code);
};

// ── Formatting in the current language ──────────────────────────────────────

// The locale Intl formats dates and numbers in. Yiddish data is thin in some
// browsers, so Hebrew is its fallback (Intl takes the first it supports).
const INTL_LOCALES = { he: "he-IL", yi: ["yi", "he-IL"], en: "en", fr: "fr", es: "es" };
export const intlLocale = () => INTL_LOCALES[i18next.language] ?? INTL_LOCALES[DEFAULT_LANGUAGE];

// An object whose values are translated when READ, not when built: `labels.x`
// is t(`${prefix}.x`) in whatever language is current at that moment. For the
// label maps that module constants hand out (roleLabels[role]), so their many
// readers keep their shape and still follow a language change.
export const translatedLabels = (prefix, keys) =>
  Object.defineProperties(
    {},
    Object.fromEntries(keys.map((key) => [key, { enumerable: true, get: () => i18next.t(`${prefix}.${key}`) }]))
  );

// ── A choice made before signing in ─────────────────────────────────────────
//
// localStorage says what language this BROWSER was last in — written when a
// person picks one and also when an account's language is adopted — so it
// cannot tell "a guest chose French" from "the last person signed in here
// reads French". This marker can: it is written only when someone picks a
// language while signed out, lives in sessionStorage (this tab, this visit),
// and is consumed by the first sign-in that follows, which saves it to the
// account. A second person signing in later on the same computer finds none.
const GUEST_CHOICE_KEY = "languageChosenSignedOut";

export const markGuestChoice = (code) => {
  try {
    sessionStorage.setItem(GUEST_CHOICE_KEY, code);
  } catch {
    // Not kept — signing in will simply use the account's language.
  }
};

export const takeGuestChoice = () => {
  try {
    const code = sessionStorage.getItem(GUEST_CHOICE_KEY);
    sessionStorage.removeItem(GUEST_CHOICE_KEY);
    return code;
  } catch {
    return null;
  }
};

// ── Start-up ────────────────────────────────────────────────────────────────

let ready = Promise.resolve();

// The remembered or guessed language, without remembering a guess. Never
// rejects: a language that cannot be loaded leaves Hebrew on screen, and
// onError (main.jsx: captureError) hears about it.
export const startLanguage = ({ onError } = {}) => {
  ready = switchTo(initialLanguage()).catch((err) => onError?.(err));
  return ready;
};

// Settles once start-up has finished switching (or failed to). Anything that
// compares the account's language with the one on screen waits for this, or it
// would compare against Hebrew while the stored language is still loading —
// and the start-up switch, landing afterwards, would undo its decision.
export const whenLanguageReady = () => ready;

export default i18next;
