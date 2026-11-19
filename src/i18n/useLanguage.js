import { useTranslation } from "react-i18next";
import { LANGUAGES, directionOf } from "./languages";

// What a component needs to know about the interface's language. Re-renders on
// a change, because useTranslation does.
//
// Read-only on purpose: changing the language is chooseLanguage (store), via
// useChooseLanguage — the one path that also saves it to a signed-in account.
// A setter here would be a second, quieter way that skips that.
export const useLanguage = () => {
  const { i18n } = useTranslation();
  // The language chosen — not i18next's resolvedLanguage, which names the
  // language strings are coming FROM and so reads "he" while a translation is
  // still empty, flipping the layout back to rtl under an English choice.
  const { language } = i18n;
  return { language, direction: directionOf(language), languages: LANGUAGES };
};
