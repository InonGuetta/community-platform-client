// The languages the INTERFACE comes in — the one list on the client.
//
// Only the site itself changes language: transcripts, summaries, books, notes
// and names stay as they were written (ARCHITECTURE.md → "Languages (i18n)").
//
// The server holds the same codes in lib/languages.js, because it words the
// mail a user receives while not in the browser; a test there compares the two
// lists (cross-repository pair #8 in CLAUDE.md). Change both together.
//
// `name` is how the language calls itself, so it is NOT translated: someone
// who cannot read the current interface must still find their own language.

export const LANGUAGES = [
  { code: "he", name: "עברית", dir: "rtl" },
  { code: "yi", name: "ייִדיש", dir: "rtl" },
  { code: "en", name: "English", dir: "ltr" },
  { code: "fr", name: "Français", dir: "ltr" },
  { code: "es", name: "Español", dir: "ltr" },
];

// The interface's first language, and the fallback for any key a translation
// does not have yet.
export const DEFAULT_LANGUAGE = "he";

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export const isSupportedLanguage = (code) => LANGUAGE_CODES.includes(code);

export const directionOf = (code) =>
  LANGUAGES.find((l) => l.code === code)?.dir ?? directionOf(DEFAULT_LANGUAGE);

// Browsers still report the codes ISO retired for these two.
const LEGACY_CODES = { iw: "he", ji: "yi" };

// The first of the browser's preferred languages that we have, by its primary
// subtag ("en-US" → "en"), or null.
export const matchBrowserLanguage = (preferred = []) => {
  for (const tag of preferred) {
    if (typeof tag !== "string") continue;
    const primary = tag.toLowerCase().split("-")[0];
    const code = LEGACY_CODES[primary] ?? primary;
    if (isSupportedLanguage(code)) return code;
  }
  return null;
};
