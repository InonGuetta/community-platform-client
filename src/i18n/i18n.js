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

// The one way a person changes the language. An unknown code is ignored rather
// than half-applied.
export const changeLanguage = async (code) => {
  if (!isSupportedLanguage(code)) return;
  await switchTo(code);
  storeLanguage(code);
};

// At start-up: the remembered or guessed language, without remembering a
// guess — only a choice the person made is stored.
export const startLanguage = () => switchTo(initialLanguage());

export default i18next;
