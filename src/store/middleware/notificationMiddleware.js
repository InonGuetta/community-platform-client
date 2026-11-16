import { notify } from "../slicesAndThunks/snackbarSlice";
import { messageForError } from "../../utilities/apiError";
import i18n from "../../i18n/i18n";

// Central place that turns Redux mutation outcomes into user-facing toasts, so
// individual components/thunks don't each have to wire feedback. Keyed by the
// thunk's base type (without the /pending|/fulfilled|/rejected suffix).
//
// Only actions with words in the "toasts" namespace produce a toast —
// everything else stays silent. This is deliberate: blanket "toast on every
// rejection" would spam benign cases like auth/fetchMe (rejected for anonymous
// visitors) or transcript/fetch (rejected while polling a not-yet-ready
// transcript), so those are intentionally absent.
//
// toasts:success.<action>: only for mutations that otherwise give NO feedback.
// Flows that surface their own inline feedback are left out on purpose, to
// avoid a double message — auth/* (the sign-in and sign-up forms' alerts) and
// transcript/update (the transcript editor's own "saved").
//
// toasts:failure.<action>: failures that would otherwise be silent, in the
// interface's words rather than the thunk's English payload. auth/* stay out.
// The words for a specific reason — a duplicate email, an expired session —
// are errors:codes.<CODE> (messageForError, utilities/apiError.js); anything it
// has nothing specific for degrades to the per-action words, so the codes only
// ever ADD detail — an unknown code is never worse.
const SUCCESS = "toasts:success.";
const FAILURE = "toasts:failure.";

const baseType = (type) => type.replace(/\/(pending|fulfilled|rejected)$/, "");

export const notificationMiddleware = (store) => (next) => (action) => {
  // Let the action update state first, then react to the outcome. The notify()
  // we dispatch has type "notification/notify", which matches neither suffix
  // below, so this never recurses.
  const result = next(action);

  const type = action?.type;
  if (typeof type === "string") {
    if (type.endsWith("/fulfilled")) {
      const key = SUCCESS + baseType(type);
      if (i18n.exists(key)) store.dispatch(notify({ message: i18n.t(key), severity: "success" }));
    } else if (type.endsWith("/rejected")) {
      const key = FAILURE + baseType(type);
      const fallback = i18n.exists(key) ? i18n.t(key) : null;
      // Only curated actions surface an error toast (benign rejections stay quiet).
      if (fallback) {
        // Prefer the words for the specific reason so the user knows what to
        // fix; otherwise the per-action message, which already names the action
        // that failed. The code is absent whenever the rejection came from a
        // thunk's own fallback rather than from the API.
        store.dispatch(notify({
          message: messageForError(action.payload, fallback),
          severity: "error",
        }));
      }
    }
  }

  return result;
};
