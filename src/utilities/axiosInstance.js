import axios from "axios";
import { logger } from "./logger";

const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// ── Tracing every call to the API ───────────────────────────────────────────
//
// The point of this pair of interceptors is the SERVER's request id. Each
// response carries it in X-Request-Id, and the server stamps the same id on
// every log line that request produced — the SQL it ran, the errors it raised.
// Printing it next to the browser-side outcome is what makes it possible to
// take a failure a user is looking at and find the matching server log, instead
// of correlating by timestamp and hoping.
//
// The URL is logged; bodies are not. A request body here is a password, a
// transcript, or a note — exactly what must not be written to a console someone
// else may be looking over the shoulder of.
const describe = (config = {}) =>
  `${(config.method || "get").toUpperCase()} ${config.url}`;

const elapsed = (config) =>
  config?.__startedAt ? ` ${(performance.now() - config.__startedAt).toFixed(0)}ms` : "";

axiosInstance.interceptors.request.use((config) => {
  config.__startedAt = performance.now();
  logger.debug(`[api] → ${describe(config)}`);
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    const requestId = response.headers?.["x-request-id"];
    logger.debug(
      `[api] ← ${describe(response.config)} ${response.status}${elapsed(response.config)}` +
      (requestId ? ` [${requestId}]` : "")
    );
    return response;
  },
  (error) => {
    // Registered before the retry interceptor below, so this fires for the
    // FIRST failure of a request that will go on to be retried — which is the
    // one worth seeing. The retry itself re-enters as a fresh request and gets
    // its own line.
    const requestId = error?.response?.headers?.["x-request-id"];
    const status = error?.response?.status ?? "no response";
    logger.warn(
      `[api] ✕ ${describe(error?.config)} ${status}${elapsed(error?.config)}` +
      (requestId ? ` [${requestId}]` : "")
    );
    return Promise.reject(error);
  }
);

// What to do when the server says we are no longer authenticated. Injected
// rather than imported: store.js already reaches this module through its
// slices, so importing the store — or even a single action creator from
// authSlice — back into here would close an import cycle and leave one side
// undefined while the other is still evaluating. A callback keeps this module a
// leaf of the import graph that knows nothing about Redux.
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// A 401 from the auth endpoints is normal traffic, not an expired session:
// /auth/me is what an anonymous visitor gets on first load (fetchMe.rejected
// already handles that one), and /auth/login answers 401 for wrong credentials.
// Treating those as an expiry would fight the existing handling and would wipe
// state while the user is simply typing their password wrong.
const isAuthRequest = (url = "") => url.startsWith("/auth/");

// ── Retrying a request the server never processed ───────────────────────────
//
// The API is not reachable for the first few seconds of its life: it imports the
// AWS/OpenAI/Stripe/Bull clients before it listens, `node --watch` repeats that
// on every save, and a deploy has the same gap. The browser is already serving
// the app by then, so the first /auth/me and the first login or two land in a
// hole and fail. Nothing retried them, so the user saw an error and had to click
// again — two or three times — until the server happened to be up.
//
// The distinction that makes an automatic retry safe is not the status code but
// whether the request was *processed*. These failures all mean it was not:
//   - 502/503/504 — a gateway (the Vite dev proxy, nginx) could not reach the
//     API, or the API itself answered 503 because its database was unreachable.
//     In both cases the handler never ran, so nothing changed server-side.
//   - no response at all — no proxy in front, so the connection error surfaces
//     raw. This one is genuinely ambiguous: a socket that dies mid-flight might
//     have been processed and only lost its reply. Hence the method guard below.
const RETRIABLE_STATUSES = new Set([502, 503, 504]);

// The Vite dev proxy stamps this code on the 503 it invents when nothing is
// listening on :3001, which is proof the request never reached Express. So is
// no response at all — there was no gateway to answer in the first place.
// Anything else in RETRIABLE_STATUSES *might* be the API's own answer, so it is
// treated as processed.
const neverReachedServer = (error) =>
  !error.response || error.response.data?.code === "API_UNAVAILABLE";

// Idempotent by HTTP semantics, plus the two POSTs that are safe to repeat by
// inspection: login only reads and sets a cookie, logout only clears one.
// Register is deliberately absent — a replay after a lost response would answer
// "Email already in use", which is worse than the error it replaced.
const IDEMPOTENT_METHODS = new Set(["get", "head", "options", "put", "delete"]);
const REPLAYABLE_POSTS = new Set(["/auth/login", "/auth/logout"]);

const isReplayable = (config = {}) =>
  IDEMPOTENT_METHODS.has((config.method || "get").toLowerCase()) ||
  REPLAYABLE_POSTS.has(config.url);

// Six attempts over ~11s. The previous ~4s was measured against a warm
// `node --watch` restart and was too tight for the case that actually bites: the
// first boot of the day, where loading the server's module graph (the AWS /
// OpenAI / Stripe / Bull clients) takes ~2.5s warm and several seconds more off
// a cold disk cache. A first login would spend every attempt and still fail —
// the retry fired and gave up, which is the worst of both.
export const RETRY_DELAYS_MS = [400, 900, 1800, 3200, 5000];

// The schedule above is only free to be this long because a request the API
// never received costs nothing. /auth/login sits behind a 10-per-minute limiter
// and express-rate-limit counts failures too, but a request answered by the
// proxy never reaches that middleware. When the API *is* up and answering 5xx
// itself — a database it cannot reach — the attempts do count, so those stop
// after the first two delays and leave a user room to click again.
const PROCESSED_RETRY_LIMIT = 2;

export const shouldRetry = (error, attempt) => {
  if (attempt >= RETRY_DELAYS_MS.length) return false;
  if (axios.isCancel(error)) return false;
  if (!error?.config) return false; // nothing to replay
  if (!isReplayable(error.config)) return false;
  if (error.response && !RETRIABLE_STATUSES.has(error.response.status)) return false;
  return neverReachedServer(error) || attempt < PROCESSED_RETRY_LIMIT;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryUnreachable = (error) => {
  const attempt = error?.config?.__retryCount ?? 0;
  if (!shouldRetry(error, attempt)) return Promise.reject(error);

  // Mutating the config object the retry is issued with is what makes the count
  // survive into the next pass through this interceptor.
  error.config.__retryCount = attempt + 1;
  return sleep(RETRY_DELAYS_MS[attempt]).then(() => axiosInstance(error.config));
};

// Normalize failures so every consumer can safely read error.response.data.message.
// The API always answers errors as JSON { message }, but two cases break that
// assumption and used to surface as a misleading generic error (e.g. "Login failed",
// which reads like wrong credentials):
//   1. No response at all — the backend is down and nothing is proxying for it.
//   2. A non-JSON body — a gateway that cannot reach the API answers with its own
//      text/plain body, so error.response.data is a string and data.message is
//      undefined.
// Both only get here once every retry above has already been spent.
const normalizeError = (error) => {
  // A retried request is normalized by the inner pass; without this guard the
  // outer pass would fire onUnauthorized a second time for the same 401.
  if (error?.__normalized) return Promise.reject(error);
  if (error && typeof error === "object") error.__normalized = true;

  if (!error.response) {
    error.response = {
      data: {
        message:
          "Cannot reach the server. It may still be starting up — wait a moment and try again.",
      },
    };
    return Promise.reject(error);
  }

  const { data, status } = error.response;

  // The httpOnly cookie lasts 7 days and expires without the client noticing.
  // Before this, every request afterwards failed while the UI still showed a
  // signed-in user, so the app looked broken rather than logged out. Clearing
  // auth state is all that is needed — ProtectedRoute already redirects to
  // /sign-in once there is no user, so there is no navigation to perform from
  // outside React.
  if (status === 401 && !isAuthRequest(error.config?.url)) {
    onUnauthorized?.();
  }

  if (typeof data !== "object" || data === null) {
    error.response.data = {
      message:
        status >= 500
          ? "The server is temporarily unavailable. Please try again in a moment."
          : "Unexpected server response. Please try again.",
    };
  }

  return Promise.reject(error);
};

// Order matters: the retry runs first so that a request which succeeds on a
// later attempt never reaches the normalizer at all, and a request that has
// exhausted its attempts falls through to it with the original failure intact.
axiosInstance.interceptors.response.use((response) => response, retryUnreachable);
axiosInstance.interceptors.response.use((response) => response, normalizeError);

export { normalizeError };
export default axiosInstance;
