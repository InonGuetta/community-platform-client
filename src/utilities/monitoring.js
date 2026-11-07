// ── External error monitoring in the browser (PRD NFR-1) ─────────────────────
//
// The server's lib/monitoring.js, for the client: the crash a reader sees as
// "משהו השתבש" and nobody else ever hears about. Off unless VITE_SENTRY_DSN is
// set at build time, and then the SDK is loaded on its own: it is a separate
// chunk (~160 KB gzipped) that a build without a DSN never downloads — the
// main bundle does not contain it (checked: 0 mentions of "sentry").
//
// NO PERSONAL DATA leaves the browser, for the server's reasons and one more:
// the URL. A lesson page's address is harmless, but a reset-password link
// carries its token, and search pages carry what was searched. So:
//
//   - no default integrations: no breadcrumbs of clicks, console lines or
//     fetch calls, no session replay, no tracing — only uncaught errors and
//     unhandled rejections (globalHandlers), and what captureError is handed;
//   - scrubEvent strips the user, the request's headers and cookies, the query
//     string and fragment of every URL, and emails or tokens inside a message.

let sentry = null;      // the SDK, once loaded
let loading = null;     // the promise loading it
const waiting = [];     // errors captured before it arrived — sent once it does
const MAX_WAITING = 10;

const EMAIL = /[^\s@"'()<>]+@[^\s@"'()<>]+\.[^\s@"'()<>]+/g;
const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g;
const KEY = /\b(sk|pk|rk|whsec)_(test|live)_[\w]+/g;

export const scrubText = (text) =>
  String(text ?? "").replace(EMAIL, "[email]").replace(JWT, "[token]").replace(KEY, "[key]");

// "https://host/reset-password?token=…#x" → "https://host/reset-password"
export const scrubUrl = (url) => String(url ?? "").split(/[?#]/)[0];

export const scrubEvent = (event) => {
  if (!event) return event;
  delete event.user;
  if (event.request) event.request = { url: scrubUrl(event.request.url) };
  event.breadcrumbs = [];
  if (event.message) event.message = scrubText(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubText(exception.value);
    for (const frame of exception.stacktrace?.frames ?? []) {
      if (frame.filename) frame.filename = scrubUrl(frame.filename);
      if (frame.abs_path) frame.abs_path = scrubUrl(frame.abs_path);
    }
  }
  return event;
};

const send = (error, context) =>
  sentry.captureException(error, { tags: context?.tags, extra: context?.extra });

/**
 * Start reporting, if a DSN was built in. Called once, from main.jsx.
 * @param {{ dsn?: string, load?: () => Promise<any> }} [options]  the tests' stand-ins
 */
export const initMonitoring = ({
  dsn = import.meta.env.VITE_SENTRY_DSN,
  load = () => import("@sentry/react"),
} = {}) => {
  if (!dsn || loading) return loading;
  loading = load()
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        defaultIntegrations: false,
        integrations: [Sentry.globalHandlersIntegration(), Sentry.dedupeIntegration()],
        tracesSampleRate: 0,
        maxBreadcrumbs: 0,
        beforeBreadcrumb: () => null,
        beforeSend: (event) => scrubEvent(event),
        initialScope: { tags: { service: "web" } },
      });
      sentry = Sentry;
      for (const [error, context] of waiting.splice(0)) send(error, context);
      return true;
    })
    // Monitoring must never be why the app misbehaves.
    .catch(() => false);
  return loading;
};

/**
 * Report one error. Never throws; a no-op without a DSN.
 * @param {unknown} error
 * @param {{ tags?: object, extra?: object }} [context]  ids and names only
 */
export const captureError = (error, context) => {
  try {
    if (sentry) send(error, context);
    else if (loading && waiting.length < MAX_WAITING) waiting.push([error, context]);
  } catch {
    // Reporting a failure must not become a second one.
  }
};

// For the tests: back to "never started".
export const resetMonitoringForTests = () => {
  sentry = null;
  loading = null;
  waiting.length = 0;
};
