import { formatHebrewDate } from "./formatDate";

// How a notification reads in the bell, and where clicking it goes.
//
// The server stores what HAPPENED (a type) and the facts to describe it (a
// payload) — never a sentence; migration 035 says why. This is the one place
// the client words them, and the mail has its own wording in the server's
// lib/mailer.js. A type added on the server needs a case here and one there.
//
// An unknown type still renders — generically, with no link — rather than
// disappearing or throwing: a server deployed ahead of this client would
// otherwise produce a bell whose count says 1 over an empty list.

const ROLE_NAMES = { lecturer: "מרצה", admin: "מנהל" };

// "עם הרב לוי · גמרא" — the host, and the course when the session is held for
// one (PRD D8), so a student in two courses knows which class it is.
const byHost = (payload) =>
  `${payload.hostName ? ` עם ${payload.hostName}` : ""}${payload.courseTitle ? ` · ${payload.courseTitle}` : ""}`;

// "יום ג׳, 3 בנובמבר, 19:30" — in Israel's zone, named, like every time the
// platform shows (see formatDate.js).
const sessionWhen = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("he-IL", {
    weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  });
};

export const describeNotification = (notification) => {
  const payload = notification?.payload ?? {};
  switch (notification?.type) {
    case "role_request": {
      const who = payload.displayName || payload.email || "משתמש";
      const role = ROLE_NAMES[payload.requestedRole] || payload.requestedRole || "";
      return {
        title: "בקשת הרשאה חדשה",
        body: `בקשה להרשאת ${role} מאת ${who}`,
        href: "/users",
      };
    }
    case "processing_done":
      return {
        title: "העיבוד הסתיים",
        body: `"${payload.title || "השיעור"}" מוכן: התמלול והסיכום זמינים`,
        href: payload.mediaId ? `/media/${payload.mediaId}` : null,
      };
    case "processing_error":
      return {
        title: "העיבוד נכשל",
        body: payload.reason
          ? `"${payload.title || "השיעור"}": ${payload.reason}`
          : `"${payload.title || "השיעור"}". אפשר לנסות שוב מעמוד השיעור`,
        href: payload.mediaId ? `/media/${payload.mediaId}` : null,
      };
    case "session_scheduled":
      return {
        title: "נקבע מפגש",
        body: `"${payload.title || "מפגש חי"}"${byHost(payload)}${payload.startsAt ? `, ${sessionWhen(payload.startsAt)}` : ""}`,
        href: "/sessions",
      };
    case "session_reminder":
      return {
        title: "המפגש מתחיל בעוד כרבע שעה",
        body: `"${payload.title || "מפגש חי"}"${byHost(payload)}`,
        href: "/sessions",
      };
    case "session_starting":
      return {
        title: "המפגש התחיל",
        body: `"${payload.title || "מפגש חי"}"${byHost(payload)}`,
        href: "/sessions",
      };
    // Joining a course by its code (PRD ROST-9).
    case "course_join_request":
      return {
        title: "בקשת הצטרפות לקורס",
        body: `${payload.requesterName || "משתמש"} מבקש להצטרף ל"${payload.courseTitle || "קורס"}"`,
        href: "/courses",
      };
    case "course_join_approved":
      return {
        title: "התקבלת לקורס",
        body: `"${payload.courseTitle || "הקורס"}": השיעורים פתוחים לך עכשיו`,
        href: "/my-courses",
      };
    case "course_join_rejected":
      return {
        title: "הבקשה להצטרף לא אושרה",
        body: `"${payload.courseTitle || "הקורס"}"`,
        href: "/my-courses",
      };
    case "new_lesson":
      return {
        title: "שיעור חדש בקורס",
        body: `"${payload.title || "שיעור"}"${payload.courseTitle ? ` · ${payload.courseTitle}` : ""}`,
        href: payload.mediaId ? `/media/${payload.mediaId}` : null,
      };
    default:
      return { title: "התראה", body: "", href: null };
  }
};

// "לפני 5 דקות" for the recent ones, the date for anything older than a day —
// a bell is read for what is new, and "לפני 340 שעות" says nothing a date does
// not say better.
export const notificationAge = (createdAt, now = Date.now()) => {
  const at = new Date(createdAt).getTime();
  if (Number.isNaN(at)) return "";
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return "עכשיו";
  if (minutes < 60) return minutes === 1 ? "לפני דקה" : `לפני ${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "לפני שעה" : `לפני ${hours} שעות`;
  return formatHebrewDate(createdAt);
};
