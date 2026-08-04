import { logger, debugEnabled } from "../../utilities/logger";

// Traces every action through the store, which is what makes a failing page
// diagnosable without adding a log to the thunk that happens to be suspected.
//
// Async thunks are the reason this is worth having. Each one produces three
// actions — pending, fulfilled, rejected — and the interesting part is which of
// the three arrived and how long it took to get there. A rejection also carries
// the reason in its payload, and that is normally the first thing anyone wants
// to see; without this it is only visible by stepping through the reducer.
//
// State is deliberately NOT logged. It holds the signed-in user and every note
// and transcript the session has loaded, so dumping it on each action would
// print the user's own content to the console dozens of times a minute — and it
// is already inspectable on demand in the Redux DevTools.

const PENDING = "/pending";
const FULFILLED = "/fulfilled";
const REJECTED = "/rejected";

const baseType = (type) => type.replace(/\/(pending|fulfilled|rejected)$/, "");

// requestId is Redux Toolkit's own per-thunk id — the way to tell two concurrent
// runs of the same thunk apart, which is exactly the case that is confusing
// without it (two media pages loading, one failing).
const startedAt = new Map();

export const loggerMiddleware = () => (next) => (action) => {
  const type = action?.type;
  if (typeof type !== "string") return next(action);

  const id = action.meta?.requestId;

  if (type.endsWith(PENDING)) {
    if (id) startedAt.set(id, performance.now());
    logger.debug(`[redux] ⏳ ${baseType(type)}`);
  } else if (type.endsWith(FULFILLED)) {
    const took = id && startedAt.has(id) ? ` ${(performance.now() - startedAt.get(id)).toFixed(0)}ms` : "";
    startedAt.delete(id);
    logger.debug(`[redux] ✓ ${baseType(type)}${took}`);
  } else if (type.endsWith(REJECTED)) {
    const took = id && startedAt.has(id) ? ` ${(performance.now() - startedAt.get(id)).toFixed(0)}ms` : "";
    startedAt.delete(id);
    // A rejection is worth a warn even in a quiet build: it is the actual
    // failure, and the reason the user is about to see an error toast.
    const reason = action.payload ?? action.error?.message ?? "unknown";
    logger.warn(`[redux] ✕ ${baseType(type)}${took} — ${reason}`);
  } else if (debugEnabled()) {
    // Plain synchronous actions: the name alone. Guarded because these are the
    // high-frequency ones (a toast opening, a dialog toggling).
    logger.debug(`[redux] · ${type}`);
  }

  return next(action);
};
