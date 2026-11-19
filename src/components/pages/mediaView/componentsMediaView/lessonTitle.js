// No headline ends with a full stop (Redesign v4, decision 6; D-96). A lesson's
// title is typed by whoever uploaded it, and many end in one ("שמירת הברית.").
// The H1 drops a single trailing period — and the spaces around it — for the
// heading only; the title itself is stored, searched, shared and listed exactly
// as it was written. An ellipsis ("…" or "...") is kept: it says something.
export const lessonTitleForHeading = (title) => {
  const text = String(title ?? "").trimEnd();
  if (text.endsWith("..")) return text;
  return text.endsWith(".") ? text.slice(0, -1).trimEnd() : text;
};
