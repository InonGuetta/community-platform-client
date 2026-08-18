// Everything the client knows about an API failure: the stable codes, and the
// one function that turns an axios error into a thunk rejection.
//
// Imports nothing, deliberately. axiosInstance and the store's notification
// middleware both depend on this, and axiosInstance is forbidden from reaching
// the store at any depth (see imports.test.js) — a leaf cannot close that cycle.

// ── The codes ───────────────────────────────────────────────────────────────
//
// The first group MIRRORS the server's ERROR_CODES in
// community-platform-server/lib/AppError.js. Edit both together: this is the
// same two-repository hazard as socketEvents.js, and it fails the same silent
// way — a code that exists on only one side raises no error anywhere, the
// lookup below simply misses and the user gets the generic message back.
// notificationMiddleware.test.js checks that every Hebrew entry is keyed on a
// code listed here, which catches a typo but cannot see across the repos.
//
// Why codes at all: the Hebrew used to be keyed on the server's English prose,
// matched character for character. The AppError header warned that rewording a
// message would break the translation silently — and it had already happened.
// axiosInstance's "cannot reach the server" text was reworded and its Hebrew
// entry stopped matching, so that case had been falling back to the generic
// message for as long as the wording had differed, with nothing to report it.
export const ERROR_CODES = {
  // Generic — the default on every AppError the server throws.
  NOT_FOUND: "NOT_FOUND",
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  DB_UNAVAILABLE: "DB_UNAVAILABLE",
  INTERNAL: "INTERNAL_ERROR",

  // Authentication.
  INVALID_TOKEN: "INVALID_TOKEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  LAST_ACTIVE_ADMIN: "LAST_ACTIVE_ADMIN",

  // Account recovery.
  INVALID_RESET_TOKEN: "INVALID_RESET_TOKEN",
  WEAK_PASSWORD: "WEAK_PASSWORD",
  NO_PASSWORD_SET: "NO_PASSWORD_SET",

  // Donations.
  RECURRING_UNAVAILABLE: "RECURRING_UNAVAILABLE",

  // Resources.
  MEDIA_NOT_FOUND: "MEDIA_NOT_FOUND",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_FORBIDDEN: "SESSION_FORBIDDEN",
  SESSION_NOT_STARTED: "SESSION_NOT_STARTED",
  BOOKMARK_NOT_FOUND: "BOOKMARK_NOT_FOUND",
  NOTE_NOT_FOUND: "NOTE_NOT_FOUND",
  COURSE_NOT_FOUND: "COURSE_NOT_FOUND",
  TRANSCRIPT_NOT_FOUND: "TRANSCRIPT_NOT_FOUND",
  PLAYLIST_TITLE_TAKEN: "PLAYLIST_TITLE_TAKEN",

  // The transcript pipeline.
  NO_TRANSCRIPT_TEXT: "NO_TRANSCRIPT_TEXT",
  NO_TRANSCRIPT_CONTENT: "NO_TRANSCRIPT_CONTENT",
  NO_KEY_POINTS: "NO_KEY_POINTS",
  UNSUPPORTED_TEXT_FORMAT: "UNSUPPORTED_TEXT_FORMAT",
  ALREADY_QUEUED: "ALREADY_QUEUED",
  ALREADY_RUNNING: "ALREADY_RUNNING",

  // ── Client-originated ──────────────────────────────────────────────────────
  // These never come from the server; axiosInstance stamps them on failures the
  // server was never reached for, or answered in a shape it does not control.
  // They are here rather than in axiosInstance so that the Hebrew lookup has one
  // list to consult and does not have to import from the API layer, which the
  // import guard forbids.

  // The Vite dev proxy / a gateway answering for an API that is not listening.
  API_UNAVAILABLE: "API_UNAVAILABLE",
  // No response at all — nothing was even proxying.
  NETWORK_UNREACHABLE: "NETWORK_UNREACHABLE",
  // A response arrived, but its body was not the JSON the API always sends.
  SERVER_UNAVAILABLE: "SERVER_UNAVAILABLE",
  BAD_RESPONSE: "BAD_RESPONSE",
};

// ── The thunk rejection ─────────────────────────────────────────────────────
//
// Every thunk in the store rejects through this. It used to be 42 copies of
// `err.response?.data?.message || "Failed to …"`, which carried the prose and
// dropped the code — so the code existed on the wire and was thrown away one
// layer before anything could use it.
//
// The shape is `{ message, code }`, and both halves have a job: `code` is what
// the notification middleware translates, `message` is the English fallback for
// the cases with no code (a thunk's own default, an unrecognised failure) and is
// what the slices store in `state.error` for the inline auth alerts.
export const rejectionOf = (err, fallback) => ({
  message: err?.response?.data?.message || fallback,
  code: err?.response?.data?.code,
});

// ── The Hebrew ──────────────────────────────────────────────────────────────
//
// Keyed on the code, never on the message. The messages are English prose
// written for a developer reading a log, and they get reworded; the codes are an
// identifier the server promises not to change.
//
// This map used to live in the store's notification middleware, keyed on the
// prose and matched character for character. The server's AppError header warned
// in as many words that rewording a message would break the translation with no
// error anywhere — and by the time it was rewritten it already had, twice.
//
// It sits here rather than in the middleware because the toasts are no longer
// the only consumer: the sign-in and sign-up forms show their errors inline, and
// were showing them in English.
const ERROR_CODE_HE = {
  [ERROR_CODES.EMAIL_TAKEN]: "האימייל כבר בשימוש",
  [ERROR_CODES.INVALID_CREDENTIALS]: "אימייל או סיסמה שגויים",
  // A 401 mid-session: a toast would otherwise blame whatever request happened
  // to be in flight ("טעינת המדיה נכשלה") instead of the real cause.
  [ERROR_CODES.UNAUTHORIZED]: "פג תוקף החיבור, יש להתחבר מחדש",
  [ERROR_CODES.INVALID_TOKEN]: "פג תוקף החיבור, יש להתחבר מחדש",
  [ERROR_CODES.FORBIDDEN]: "אין לך הרשאה לפעולה זו",
  [ERROR_CODES.LAST_ACTIVE_ADMIN]:
    "לא ניתן להסיר את המנהל הפעיל האחרון — יש למנות מנהל אחר קודם",

  // Each of these tells the user which of three different things to do next,
  // which is the whole test for whether a code earns its place.
  [ERROR_CODES.INVALID_RESET_TOKEN]:
    "הקישור אינו תקף או שפג תוקפו. אפשר לבקש קישור חדש.",
  [ERROR_CODES.WEAK_PASSWORD]: "הסיסמה חייבת להכיל לפחות 8 תווים",
  [ERROR_CODES.NO_PASSWORD_SET]:
    "החשבון הזה מתחבר עם Google ואין לו סיסמה לשינוי",
  [ERROR_CODES.RECURRING_UNAVAILABLE]:
    "תרומה חודשית אינה זמינה עדיין. אפשר לתרום סכום חד-פעמי.",

  [ERROR_CODES.MEDIA_NOT_FOUND]: "המדיה לא נמצאה",
  [ERROR_CODES.SESSION_NOT_FOUND]: "המפגש לא נמצא",
  [ERROR_CODES.SESSION_FORBIDDEN]: "המפגש לא נמצא או שאין לך הרשאה",
  [ERROR_CODES.SESSION_NOT_STARTED]: "המפגש עדיין לא נפתח על ידי המארח",
  [ERROR_CODES.BOOKMARK_NOT_FOUND]: "הסימנייה לא נמצאה",
  [ERROR_CODES.NOTE_NOT_FOUND]: "ההערה לא נמצאה",
  [ERROR_CODES.COURSE_NOT_FOUND]: "הקורס לא נמצא",
  [ERROR_CODES.TRANSCRIPT_NOT_FOUND]: "התמלול לא נמצא",
  // Without this the user saw the generic "יצירת הרשימה נכשלה" and retried the
  // same name, which is the one thing that cannot work.
  [ERROR_CODES.PLAYLIST_TITLE_TAKEN]: "כבר קיימת רשימה בשם הזה",

  [ERROR_CODES.NO_TRANSCRIPT_TEXT]: "אין טקסט תמלול לתיקון",
  [ERROR_CODES.NO_TRANSCRIPT_CONTENT]: "אין עדיין תוכן תמלול — הפעל תמלול קודם",
  [ERROR_CODES.NO_KEY_POINTS]: "ניתוח ה-AI לא הפיק נקודות מפתח",
  [ERROR_CODES.UNSUPPORTED_TEXT_FORMAT]:
    "לא ניתן להפיק סיכום מקובץ מסוג זה. נתמכים: PDF, DOCX, TXT.",
  [ERROR_CODES.ALREADY_QUEUED]: "הפעולה כבר רצה עבור מדיה זו",
  [ERROR_CODES.ALREADY_RUNNING]: "הפעולה כבר רצה עבור מדיה זו",

  [ERROR_CODES.DB_UNAVAILABLE]: "מסד הנתונים אינו זמין כרגע, נסה שוב",
  [ERROR_CODES.INTERNAL]: "שגיאת שרת פנימית",
  [ERROR_CODES.API_UNAVAILABLE]: "לא ניתן להגיע לשרת. ודא שהוא פועל ונסה שוב.",
  [ERROR_CODES.NETWORK_UNREACHABLE]:
    "לא ניתן להגיע לשרת. ייתכן שהוא עדיין עולה — המתן רגע ונסה שוב.",
  [ERROR_CODES.SERVER_UNAVAILABLE]: "השרת אינו זמין כרגע. נסה שוב בעוד רגע.",
  [ERROR_CODES.BAD_RESPONSE]: "תגובת שרת בלתי צפויה. נסה שוב.",
};

export { ERROR_CODE_HE };

// The Hebrew for a rejection, or `fallback` when the code is one we have nothing
// specific to say about. Takes the whole rejection rather than a bare code so
// callers cannot forget which half to pass — and so a caller that still holds a
// plain string (or nothing) degrades to the fallback instead of throwing.
//
// NEVER returns the server's English `message`. That message is a developer's
// log line, and letting it through is how "Invalid credentials" ended up on
// screen in a Hebrew, right-to-left application.
export const hebrewForError = (rejection, fallback) =>
  ERROR_CODE_HE[rejection?.code] || fallback;
