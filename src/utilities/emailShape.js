// Is this SHAPED like an address?
//
// A MIRROR of emailProblem in the server's lib/validate.js. The two repositories
// share no code, so this is a copy — and the direction of any drift is the safe
// one: the server is the authority and re-checks everything, so a client that is
// too permissive only means the user learns a moment later. A client that is
// too strict would lock somebody out with no way around it, which is why both
// copies err towards accepting.
//
// It exists at all because the alternative is a round trip to be told about a
// missing dot. `type="email"` on the input is not enough: browsers accept
// "user@localhost" and reject nothing a person is likely to mistype.

const EMAIL_MAX = 254;
const LOCAL_MAX = 64;
const LABEL_MAX = 63;

const LOCAL_ALLOWED = /^[^\s@,;:<>()[\]\\"]+$/u;
const LABEL = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;
const TLD = /^\p{L}{2,}$/u;

/** Returns null when usable, or a Hebrew reason when not. */
export const emailProblem = (value) => {
  if (typeof value !== "string" || value.trim() === "") return "יש להזין כתובת אימייל";

  const email = value.trim();
  if (email.length > EMAIL_MAX) return "כתובת האימייל ארוכה מדי";
  if (/\s/.test(email)) return "כתובת אימייל אינה יכולה להכיל רווחים";

  const at = email.split("@");
  if (at.length < 2) return "כתובת אימייל חייבת להכיל @";
  if (at.length > 2) return "כתובת אימייל יכולה להכיל @ אחד בלבד";

  const [local, domain] = at;

  if (local.length === 0) return "חסר החלק שלפני ה-@";
  if (local.length > LOCAL_MAX) return "החלק שלפני ה-@ ארוך מדי";
  if (!LOCAL_ALLOWED.test(local)) return "החלק שלפני ה-@ מכיל תווים שאינם חוקיים";
  if (local.startsWith(".") || local.endsWith(".")) return "החלק שלפני ה-@ אינו יכול להתחיל או להסתיים בנקודה";
  if (local.includes("..")) return "החלק שלפני ה-@ מכיל שתי נקודות רצופות";

  if (domain.length === 0) return "חסר שם הדומיין אחרי ה-@";
  if (domain.includes("..")) return "שם הדומיין מכיל שתי נקודות רצופות";
  if (domain.startsWith(".") || domain.endsWith(".")) return "שם הדומיין אינו יכול להתחיל או להסתיים בנקודה";

  const labels = domain.split(".");
  if (labels.length < 2) return "חסרה סיומת בדומיין (למשל ‎.com‎)";

  for (const label of labels) {
    if (label.length === 0 || label.length > LABEL_MAX) return "שם הדומיין אינו תקין";
    if (!LABEL.test(label)) return "שם הדומיין מכיל תווים שאינם חוקיים";
  }

  if (!TLD.test(labels[labels.length - 1])) return "סיומת הדומיין אינה תקינה (למשל ‎.com‎, ‎.co.il‎)";

  return null;
};
