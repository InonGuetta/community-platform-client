// A lesson's suggested chat questions (PRD ASK-7) in the reader's language.
//
// The server writes them in every interface language at once (migration 053):
// { he: [...], yi: [...], en: [...], fr: [...], es: [...] }. A language the
// model left out — or a lesson whose questions predate 053, a plain Hebrew
// list — gives null here, and the chat offers its fixed questions in the
// reader's language instead (ChatPane → suggestionsFor), never another
// language's.

/**
 * @param {unknown} stored  transcripts.suggested_questions as the API returns it
 * @param {string} language  the interface language
 * @returns {string[] | null}
 */
export const questionsIn = (stored, language) => {
  if (Array.isArray(stored)) return language === "he" && stored.length ? stored : null;
  const list = stored && typeof stored === "object" ? stored[language] : null;
  return Array.isArray(list) && list.length ? list : null;
};
