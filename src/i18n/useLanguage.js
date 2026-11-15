import { useTranslation } from "react-i18next";
import { LANGUAGES, directionOf } from "./languages";
import { changeLanguage } from "./i18n";

// What a component needs to know about the interface's language, and the way
// to change it. Re-renders on a change, because useTranslation does.
export const useLanguage = () => {
  const { i18n } = useTranslation();
  // The language chosen — not i18next's resolvedLanguage, which names the
  // language strings are coming FROM and so reads "he" while a translation is
  // still empty, flipping the layout back to rtl under an English choice.
  const { language } = i18n;
  return {
    language,
    direction: directionOf(language),
    languages: LANGUAGES,
    setLanguage: changeLanguage,
  };
};
