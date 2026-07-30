// Turning a getUserMedia failure into something a person can act on.
//
// Previously there was no catch at all: a denied permission produced an
// unhandled rejection, the room was never joined, and the user stared at an
// empty grid with nothing explaining why.

const MESSAGE_BY_NAME = {
  NotAllowedError:
    "הגישה למצלמה ולמיקרופון נחסמה. אפשר להמשיך בצפייה בלבד, או לאשר את ההרשאה בדפדפן ולרענן.",
  NotFoundError:
    "לא נמצאו מצלמה או מיקרופון. הצטרפת בצפייה והאזנה בלבד.",
  NotReadableError:
    "המצלמה או המיקרופון תפוסים על ידי יישום אחר. סגור אותו ורענן, או המשך בצפייה בלבד.",
  OverconstrainedError:
    "המצלמה אינה תומכת בהגדרות הנדרשות. הצטרפת בצפייה בלבד.",
  AbortError:
    "הגישה למצלמה הופסקה. הצטרפת בצפייה בלבד.",
};

const INSECURE_CONTEXT =
  "וידאו דורש חיבור מאובטח (HTTPS). בכתובת הנוכחית הדפדפן חוסם גישה למצלמה.";

const FALLBACK = "לא ניתן לגשת למצלמה ולמיקרופון. הצטרפת בצפייה בלבד.";

// Browsers only expose navigator.mediaDevices in a secure context, so on plain
// HTTP over a LAN address it is simply missing — and the resulting error says
// nothing useful about the real cause. Worth naming explicitly, because it is a
// deployment problem that otherwise reads as a broken feature.
export const mediaDevicesUnavailable = (navigatorRef = globalThis.navigator) =>
  !navigatorRef?.mediaDevices?.getUserMedia;

export const describeMediaError = (error, { secureContext = true } = {}) => {
  if (!secureContext) return INSECURE_CONTEXT;
  return MESSAGE_BY_NAME[error?.name] || FALLBACK;
};
