// The client's counterpart to the server's lib/logger.js, and it exists for the
// same reason: a bare console.* call cannot be turned off, so anything added
// while debugging ships to production and runs in every visitor's browser.
//
// Two differences from the server version, both forced by the environment:
//
//   1. The level is decided at BUILD time, from import.meta.env. Vite inlines
//      that value and the minifier then removes the whole branch, so a debug
//      call costs nothing in the production bundle rather than merely staying
//      silent. There is no runtime LOG_LEVEL to read — the browser has no
//      environment to read it from.
//   2. `error` stays enabled in production. A user reporting a problem is
//      usually reading their own console, and a failure that leaves no trace
//      there cannot be diagnosed remotely.
//
// Never log PII. The rule the server follows applies here too, and more so: the
// browser console is visible to whoever is sitting at the machine.
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

// VITE_LOG_LEVEL overrides for the occasional "reproduce it against the real
// API" build; otherwise dev gets everything and production gets errors only.
const configured = LEVELS[import.meta.env.VITE_LOG_LEVEL];
const current = configured !== undefined
  ? configured
  : (import.meta.env.DEV ? LEVELS.debug : LEVELS.error);

const emit = (level, sink) => (...args) => {
  if (LEVELS[level] <= current) sink(`[${level}]`, ...args);
};

export const logger = {
  error: emit("error", console.error),
  warn: emit("warn", console.warn),
  info: emit("info", console.info),
  debug: emit("debug", console.debug),
};

export const debugEnabled = () => LEVELS.debug <= current;
