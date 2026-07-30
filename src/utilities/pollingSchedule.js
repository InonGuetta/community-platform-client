// Backoff schedule for the transcript poll.
//
// A fixed 4s interval meant a three-hour lecture — which takes 30-60 minutes to
// transcribe — was polled 450-900 times. Growing the gap keeps the first few
// checks fast (a short clip finishes in seconds and should feel immediate)
// while the long tail costs almost nothing.
export const POLL_INITIAL_MS = 4000;
export const POLL_MAX_MS = 30000;
const GROWTH = 1.5;

// 4s, 6s, 9s, 13.5s, 20.25s, then 30s from there on.
export const nextPollDelay = (attempt) =>
  Math.min(Math.round(POLL_INITIAL_MS * GROWTH ** Math.max(0, attempt)), POLL_MAX_MS);

// When to stop polling entirely.
//
// This exists because a wedged worker leaves status='processing' in the database
// permanently: Bull's job timeout wraps the processor's promise but cannot
// cancel it, so if the work hangs the worker's own error handler — the thing
// that writes status='error' — never runs. Nothing else will ever move that row,
// so without a ceiling the page polls forever.
//
// Two hours against a realistic worst case of about an hour. Erring low is safe
// here precisely because giving up is not final: the UI surfaces it with a
// "check again" action, so a transcription that genuinely ran long is one click
// from resuming rather than silently abandoned.
export const POLL_CEILING_MS = 2 * 60 * 60 * 1000;

export const hasExceededPollWindow = (startedAt, now = Date.now()) =>
  now - startedAt >= POLL_CEILING_MS;
