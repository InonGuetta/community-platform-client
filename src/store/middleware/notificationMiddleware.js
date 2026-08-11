import { notify } from "../slicesAndThunks/notificationSlice";
import { hebrewForError } from "../../utilities/apiError";

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
  // The save toggle itself stays silent — the button lights up, which is the
  // feedback. Making and discarding a LIST is not visible outside the menu it
  // happens in, so those two do get a toast.
  "saves/createPlaylist": "הרשימה נוצרה",
  "saves/renamePlaylist": "שם הרשימה עודכן",
  "saves/deletePlaylist": "הרשימה נמחקה",
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
  // Unlike the success side, every save failure is worth saying out loud: the
  // reducers roll the optimistic change back, so without a toast the button
  // simply un-presses itself and the user is left guessing.
  "saves/add": "השמירה נכשלה",
  "saves/remove": "ביטול השמירה נכשל",
  "saves/fetchPlaylists": "טעינת הרשימות נכשלה",
  "saves/createPlaylist": "יצירת הרשימה נכשלה",
  "saves/renamePlaylist": "שינוי שם הרשימה נכשל",
  "saves/deletePlaylist": "מחיקת הרשימה נכשלה",
  "saves/addItem": "ההוספה לרשימה נכשלה",
  "saves/removeItem": "ההסרה מהרשימה נכשלה",
};

// The Hebrew for a specific reason — a duplicate email, an expired session —
// lives in utilities/apiError.js next to the codes it is keyed on, because the
// toasts here are no longer its only consumer: the sign-in and sign-up forms
// render their errors inline and use the same lookup.
//
// Anything it has nothing specific to say about degrades to the per-action text
// below, so the map only ever ADDS detail — an unknown code is never worse.

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
        // Prefer the Hebrew for the specific reason so the user knows what to
        // fix; otherwise the per-action message, which already names the action
        // that failed. The code is absent whenever the rejection came from a
        // thunk's own fallback rather than from the API.
        store.dispatch(notify({
          message: hebrewForError(action.payload, fallback),
          severity: "error",
        }));
      }
    }
  }

  return result;
};
