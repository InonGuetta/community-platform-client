import i18n from "../../../i18n/i18n";
// Turning a getUserMedia failure into something a person can act on.
//
// Previously there was no catch at all: a denied permission produced an
// unhandled rejection, the room was never joined, and the user stared at an
// empty grid with nothing explaining why.

// The browser errors this names (sessions:media.<name>); any other gets the
// fallback.
const KNOWN_ERRORS = ["NotAllowedError", "NotFoundError", "NotReadableError", "OverconstrainedError", "AbortError"];


// Browsers only expose navigator.mediaDevices in a secure context, so on plain
// HTTP over a LAN address it is simply missing — and the resulting error says
// nothing useful about the real cause. Worth naming explicitly, because it is a
// deployment problem that otherwise reads as a broken feature.
export const mediaDevicesUnavailable = (navigatorRef = globalThis.navigator) =>
  !navigatorRef?.mediaDevices?.getUserMedia;

export const describeMediaError = (error, { secureContext = true } = {}) => {
  if (!secureContext) return i18n.t("sessions:media.insecure");
  return i18n.t(KNOWN_ERRORS.includes(error?.name) ? `sessions:media.${error.name}` : "sessions:media.fallback");
};
