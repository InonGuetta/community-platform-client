import { notify } from "../slicesAndThunks/notificationSlice";

// Central place that turns Redux mutation outcomes into user-facing toasts, so
// individual components/thunks don't each have to wire feedback. Keyed by the
// thunk's base type (without the /pending|/fulfilled|/rejected suffix).
//
// Only actions listed here produce a toast — everything else stays silent. This
// is deliberate: blanket "toast on every rejection" would spam benign cases like
// auth/fetchMe (rejected for anonymous visitors) or transcript/fetch (rejected
// while polling a not-yet-ready transcript), so those are intentionally absent.

// Success toasts: only for mutations that today give NO feedback. Flows that
// already surface their own inline feedback are excluded on purpose to avoid a
// double message — auth/* (inline Alert on Sign In/Up) and transcript/update
// (inline "נשמר" Alert in TranscriptEditor).
const SUCCESS_MESSAGES = {
  "media/upload": "המדיה הועלתה בהצלחה",
  "media/update": "המדיה עודכנה",
  "media/delete": "המדיה נמחקה",
  "users/create": "המשתמש נוצר בהצלחה",
  "users/update": "פרטי המשתמש עודכנו",
  "users/delete": "המשתמש נמחק",
  "bookmarks/create": "הסימנייה נוספה",
  "bookmarks/delete": "הסימנייה נמחקה",
  "sessions/create": "המפגש נוצר",
  "transcript/trigger": "התמלול הופעל",
  "transcript/fixHebrew": "העברית תוקנה",
  "transcript/keyPointHeadings": "כותרות המשנה נוצרו",
};

// Error toasts: surfaces failures that were previously silent. Uses curated
// Hebrew (not the raw thunk/server payload, which is English) to stay consistent
// with the rest of the UI. auth/* stay out (inline Alert already shows the error).
const ERROR_MESSAGES = {
  "media/upload": "העלאת המדיה נכשלה",
  "media/update": "עדכון המדיה נכשל",
  "media/delete": "מחיקת המדיה נכשלה",
  "media/fetchAll": "טעינת המדיה נכשלה",
  "users/create": "יצירת המשתמש נכשלה",
  "users/update": "עדכון המשתמש נכשל",
  "users/delete": "מחיקת המשתמש נכשלה",
  "users/fetchAll": "טעינת המשתמשים נכשלה",
  "bookmarks/create": "הוספת הסימנייה נכשלה",
  "bookmarks/delete": "מחיקת הסימנייה נכשלה",
  "sessions/create": "יצירת המפגש נכשלה",
  "sessions/fetchActive": "טעינת המפגשים נכשלה",
  "transcript/trigger": "הפעלת התמלול נכשלה",
  "transcript/fixHebrew": "תיקון העברית נכשל",
  "transcript/keyPointHeadings": "יצירת כותרות המשנה נכשלה",
  "transcript/search": "החיפוש נכשל",
};

// Hebrew translations of the specific reasons the server (or the axios
// interceptor) can return, so a failed action tells the user WHAT went wrong —
// e.g. a duplicate email — instead of only a generic "…נכשל". The rejectWithValue
// payload carries these exact English strings (from the server's AppError
// messages / the interceptor). Anything not listed here (dynamic messages, a
// thunk's own fallback) degrades gracefully to the per-action ERROR_MESSAGES
// text, so the map can drift without ever breaking — it only ever adds detail.
const SERVER_MESSAGE_HE = {
  "Email already in use": "האימייל כבר בשימוש",
  "Media not found": "המדיה לא נמצאה",
  "Session not found": "המפגש לא נמצא",
  "Session not found or not authorized": "המפגש לא נמצא או שאין לך הרשאה",
  "Bookmark not found": "הסימנייה לא נמצאה",
  "Transcript not found": "התמלול לא נמצא",
  "No transcript text to correct": "אין טקסט תמלול לתיקון",
  "No transcript content yet — run transcription first": "אין עדיין תוכן תמלול — הפעל תמלול קודם",
  "AI analysis produced no key points": "ניתוח ה-AI לא הפיק נקודות מפתח",
  "Transcription is not available for text media": "תמלול אינו זמין למדיה טקסטואלית",
  "Database temporarily unavailable, please retry": "מסד הנתונים אינו זמין כרגע, נסה שוב",
  "Internal server error": "שגיאת שרת פנימית",
  "Cannot reach the server. Make sure it is running, then try again.":
    "לא ניתן להגיע לשרת. ודא שהוא פועל ונסה שוב.",
  "The server is temporarily unavailable. Please try again in a moment.":
    "השרת אינו זמין כרגע. נסה שוב בעוד רגע.",
  "Unexpected server response. Please try again.": "תגובת שרת בלתי צפויה. נסה שוב.",
};

const baseType = (type) => type.replace(/\/(pending|fulfilled|rejected)$/, "");

export const notificationMiddleware = (store) => (next) => (action) => {
  // Let the action update state first, then react to the outcome. The notify()
  // we dispatch has type "notification/notify", which matches neither suffix
  // below, so this never recurses.
  const result = next(action);

  const type = action?.type;
  if (typeof type === "string") {
    if (type.endsWith("/fulfilled")) {
      const message = SUCCESS_MESSAGES[baseType(type)];
      if (message) store.dispatch(notify({ message, severity: "success" }));
    } else if (type.endsWith("/rejected")) {
      const fallback = ERROR_MESSAGES[baseType(type)];
      // Only curated actions surface an error toast (benign rejections stay quiet).
      if (fallback) {
        const payload = typeof action.payload === "string" ? action.payload : "";
        // Prefer the Hebrew translation of the specific reason so the user knows
        // what to fix; otherwise fall back to the per-action message.
        const message = SERVER_MESSAGE_HE[payload] || fallback;
        store.dispatch(notify({ message, severity: "error" }));
      }
    }
  }

  return result;
};
