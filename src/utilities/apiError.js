// Everything the client knows about an API failure: the stable codes, and the
// one function that turns an axios error into a thunk rejection.
//
// Imports nothing but the i18n instance (a leaf itself), deliberately. axiosInstance and the store's notification
// middleware both depend on this, and axiosInstance is forbidden from reaching
// the store at any depth (see imports.test.js) — a leaf cannot close that cycle.

// ── The codes ───────────────────────────────────────────────────────────────
//
// The first group MIRRORS the server's ERROR_CODES in
// community-platform-server/lib/AppError.js. Edit both together: this is the
// same two-repository hazard as socketEvents.js, and it fails the same silent
// way — a code that exists on only one side raises no error anywhere, the
// lookup below simply misses and the user gets the generic message back.
// notificationMiddleware.test.js checks that every entry in errors.json is keyed on a
// code listed here, which catches a typo but cannot see across the repos.
//
// Why codes at all: the Hebrew used to be keyed on the server's English prose,
// matched character for character. The AppError header warned that rewording a
// message would break the translation silently — and it had already happened.
// axiosInstance's "cannot reach the server" text was reworded and its Hebrew
// entry stopped matching, so that case had been falling back to the generic
// message for as long as the wording had differed, with nothing to report it.
import i18n from "../i18n/i18n";

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
  PAYMENTS_NOT_CONFIGURED: "PAYMENTS_NOT_CONFIGURED",

  // Resources.
  MEDIA_NOT_FOUND: "MEDIA_NOT_FOUND",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_FORBIDDEN: "SESSION_FORBIDDEN",
  SESSION_NOT_STARTED: "SESSION_NOT_STARTED",
  RECORDING_NOT_FOUND: "RECORDING_NOT_FOUND",
  RECORDING_CLOSED: "RECORDING_CLOSED",
  BOOKMARK_NOT_FOUND: "BOOKMARK_NOT_FOUND",
  BOOKMARK_ANCHOR_INVALID: "BOOKMARK_ANCHOR_INVALID",
  NOTE_NOT_FOUND: "NOTE_NOT_FOUND",
  COURSE_NOT_FOUND: "COURSE_NOT_FOUND",
  TRANSCRIPT_NOT_FOUND: "TRANSCRIPT_NOT_FOUND",
  PLAYLIST_TITLE_TAKEN: "PLAYLIST_TITLE_TAKEN",
  TAG_EXISTS: "TAG_EXISTS",
  TAG_PARENT_NOT_FOUND: "TAG_PARENT_NOT_FOUND",
  TAG_PROPOSAL_DECIDED: "TAG_PROPOSAL_DECIDED",
  TAG_PROPOSAL_NOT_FOUND: "TAG_PROPOSAL_NOT_FOUND",
  TAG_NAME_REQUIRED: "TAG_NAME_REQUIRED",
  TAG_TOO_LONG: "TAG_TOO_LONG",
  TAG_LIMIT: "TAG_LIMIT",
  TAG_LIMIT_WITH_PENDING: "TAG_LIMIT_WITH_PENDING",
  TAG_NOT_APPROVED: "TAG_NOT_APPROVED",
  TAG_PARENT_INVALID: "TAG_PARENT_INVALID",
  INVALID_EMAIL: "INVALID_EMAIL",

  // The transcript pipeline.
  NO_TRANSCRIPT_TEXT: "NO_TRANSCRIPT_TEXT",
  NO_TRANSCRIPT_CONTENT: "NO_TRANSCRIPT_CONTENT",
  NO_KEY_POINTS: "NO_KEY_POINTS",
  UNSUPPORTED_TEXT_FORMAT: "UNSUPPORTED_TEXT_FORMAT",
  UNVIEWABLE_TEXT_FORMAT: "UNVIEWABLE_TEXT_FORMAT",
  DOCUMENT_UNREADABLE: "DOCUMENT_UNREADABLE",
  OLD_DOC_FORMAT: "OLD_DOC_FORMAT",
  DOCUMENT_SCANNED: "DOCUMENT_SCANNED",
  DOCUMENT_TOO_SHORT: "DOCUMENT_TOO_SHORT",
  DOCUMENT_NO_TEXT: "DOCUMENT_NO_TEXT",
  ALREADY_QUEUED: "ALREADY_QUEUED",
  ALREADY_RUNNING: "ALREADY_RUNNING",
  // The monthly AI budget (server services/servicesAiUsage.js).
  AI_BUDGET_EXCEEDED: "AI_BUDGET_EXCEEDED",

  // The "דיון עם AI" chat.
  AI_NOT_READY: "AI_NOT_READY",
  AI_ANSWER_FAILED: "AI_ANSWER_FAILED",
  AI_DAILY_LIMIT: "AI_DAILY_LIMIT",
  // Joining a course by its code (PRD ROST-9).
  JOIN_CODE_NOT_FOUND: "JOIN_CODE_NOT_FOUND",
  ALREADY_ENROLLED: "ALREADY_ENROLLED",
  COURSE_IS_YOURS: "COURSE_IS_YOURS",
  JOIN_REQUEST_DECIDED: "JOIN_REQUEST_DECIDED",

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
// The shape is `{ message, code, params }`: `code` is what the notification
// middleware translates, `params` the facts its sentence needs ({ max: 20 }),
// `message` the English fallback for the cases with no code (a thunk's own
// default, an unrecognised failure) and what the slices store in `state.error`.
export const rejectionOf = (err, fallback) => ({
  message: err?.response?.data?.message || fallback,
  code: err?.response?.data?.code,
  ...(err?.response?.data?.params && { params: err.response.data.params }),
});

// ── The words ───────────────────────────────────────────────────────────────
//
// Keyed on the code, never on the message. The messages are English prose
// written for a developer reading a log, and they get reworded; the codes are an
// identifier the server promises not to change.
//
// The words live in the "errors" namespace (src/locales/<lng>/errors.json,
// codes.<CODE>), so each language says them in its own way. They used to be a
// Hebrew map keyed on the prose and matched character for character, and
// rewording a message broke the translation with no error anywhere — twice.
//
// i18n/ imports nothing from components/, store/ or api/ (imports.test.js), so
// importing it here keeps this file a leaf that axiosInstance may depend on.

// The words for a rejection, or `fallback` when the code is one there is
// nothing specific to say about. Takes the whole rejection rather than a bare
// code so callers cannot forget which half to pass — and so a caller that still
// holds a plain string (or nothing) degrades to the fallback instead of throwing.
//
// NEVER returns the server's English `message`. That message is a developer's
// log line, and letting it through is how "Invalid credentials" ended up on
// screen in a Hebrew, right-to-left application.
export const messageForError = (rejection, fallback) =>
  (rejection?.code && i18n.t(`errors:codes.${rejection.code}`, { ...rejection.params, defaultValue: "" })) || fallback;
