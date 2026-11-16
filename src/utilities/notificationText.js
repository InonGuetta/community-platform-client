import i18n, { intlLocale } from "../i18n/i18n";
import { formatDate } from "./formatDate";
import { processingReasonText } from "./processingReason";
import { roleLabels } from "./constant";

// How a notification reads in the bell, and where clicking it goes.
//
// The server stores what HAPPENED (a type) and the facts to describe it (a
// payload) — never a sentence; migration 035 says why. This is the one place
// the client words them, as notifications:types.<type>.* in the reader's
// language; the mail has its own wording in the server's locales (mail.notify).
// A type added on the server needs keys here and there, in every language.
//
// The payload's facts — a lesson's title, a host's name — are content and are
// inserted as written.
//
// An unknown type still renders — generically, with no link — rather than
// disappearing or throwing: a server deployed ahead of this client would
// otherwise produce a bell whose count says 1 over an empty list.

const t = (key, options) => i18n.t(`notifications:${key}`, options);

// " עם הרב לוי · גמרא" — the host, and the course when the session is held for
// one (PRD D8), so a student in two courses knows which class it is.
const byHost = (payload) =>
  (payload.hostName ? t("withHost", { name: payload.hostName }) : "") +
  (payload.courseTitle ? ` · ${payload.courseTitle}` : "");

// "יום ג׳, 3 בנובמבר, 19:30" — in Israel's zone, named, like every time the
// platform shows (see formatDate.js), in the reader's language.
const sessionWhen = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(intlLocale(), {
    weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  });
};

const lessonHref = (payload) => (payload.mediaId ? `/media/${payload.mediaId}` : null);

export const describeNotification = (notification) => {
  const payload = notification?.payload ?? {};
  const session = () => payload.title || t("defaults.session");
  const lesson = () => payload.title || t("defaults.lesson");
  const course = () => payload.courseTitle || t("defaults.course");
  switch (notification?.type) {
    case "role_request": {
      const who = payload.displayName || payload.email || t("defaults.someone");
      const role = roleLabels[payload.requestedRole] ?? payload.requestedRole ?? "";
      return { title: t("types.role_request.title"), body: t("types.role_request.body", { role, who }), href: "/users" };
    }
    case "processing_done":
      return {
        title: t("types.processing_done.title"),
        body: t("types.processing_done.body", { title: lesson() }),
        href: lessonHref(payload),
      };
    case "processing_error": {
      const reason = processingReasonText(payload.reason);
      return {
        title: t("types.processing_error.title"),
        body: reason
          ? t("types.processing_error.bodyWithReason", { title: lesson(), reason })
          : t("types.processing_error.body", { title: lesson() }),
        href: lessonHref(payload),
      };
    }
    case "session_scheduled":
      return {
        title: t("types.session_scheduled.title"),
        body: t("types.session_scheduled.body", {
          title: session(),
          host: byHost(payload),
          when: payload.startsAt ? `, ${sessionWhen(payload.startsAt)}` : "",
        }),
        href: "/sessions",
      };
    case "session_reminder":
    case "session_starting":
      return {
        title: t(`types.${notification.type}.title`),
        body: t("sessionBody", { title: session(), host: byHost(payload) }),
        href: "/sessions",
      };
    // Joining a course by its code (PRD ROST-9).
    case "course_join_request":
      return {
        title: t("types.course_join_request.title"),
        body: t("types.course_join_request.body", {
          who: payload.requesterName || t("defaults.someone"),
          course: payload.courseTitle || t("defaults.aCourse"),
        }),
        href: "/courses",
      };
    case "course_join_approved":
    case "course_join_rejected":
      return {
        title: t(`types.${notification.type}.title`),
        body: t(`types.${notification.type}.body`, { course: course() }),
        href: "/my-courses",
      };
    case "new_lesson":
      return {
        title: t("types.new_lesson.title"),
        body: `"${payload.title || t("defaults.aLesson")}"${payload.courseTitle ? ` · ${payload.courseTitle}` : ""}`,
        href: lessonHref(payload),
      };
    default:
      return { title: t("types.unknown.title"), body: "", href: null };
  }
};

// "לפני 5 דקות" for the recent ones, the date for anything older than a day —
// a bell is read for what is new, and "340 hours ago" says nothing a date does
// not say better.
export const notificationAge = (createdAt, now = Date.now()) => {
  const at = new Date(createdAt).getTime();
  if (Number.isNaN(at)) return "";
  const minutes = Math.floor((now - at) / 60_000);
  if (minutes < 1) return t("age.now");
  if (minutes < 60) return t("age.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("age.hours", { count: hours });
  return formatDate(createdAt);
};
