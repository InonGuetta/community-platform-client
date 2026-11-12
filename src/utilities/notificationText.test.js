import { describe, it, expect } from "vitest";
import { describeNotification, notificationAge } from "./notificationText";

describe("describeNotification", () => {
  it("words a role request and links to the users page", () => {
    const n = describeNotification({ type: "role_request", payload: { displayName: "דוד", requestedRole: "lecturer" } });
    expect(n).toEqual({ title: "בקשת הרשאה חדשה", body: "בקשה להרשאת מרצה מאת דוד", href: "/users" });
  });

  it("falls back to the email when there is no display name", () => {
    expect(describeNotification({ type: "role_request", payload: { email: "a@b.c", requestedRole: "admin" } }).body)
      .toBe("בקשה להרשאת מנהל מאת a@b.c");
  });

  it("links a finished lesson to its page", () => {
    const n = describeNotification({ type: "processing_done", payload: { mediaId: 9, title: "פרשת השבוע" } });
    expect(n.title).toBe("העיבוד הסתיים");
    expect(n.body).toContain("פרשת השבוע");
    expect(n.href).toBe("/media/9");
  });

  it("gives a failure's reason when the server sent one", () => {
    const n = describeNotification({ type: "processing_error", payload: { mediaId: 9, title: "ספר", reason: "לא נמצא טקסט קריא בקובץ." } });
    expect(n.body).toBe('"ספר": לא נמצא טקסט קריא בקובץ.');
  });

  it("says to retry when there is no reason", () => {
    expect(describeNotification({ type: "processing_error", payload: { mediaId: 9, title: "ספר" } }).body)
      .toContain("אפשר לנסות שוב");
  });

  it("words the three session notices and links them to the sessions page", () => {
    const payload = { sessionId: 4, title: "שיעור ערב", hostName: "הרב לוי", startsAt: "2026-11-03T17:30:00Z" };
    const scheduled = describeNotification({ type: "session_scheduled", payload });
    expect(scheduled.title).toBe("נקבע מפגש");
    expect(scheduled.body).toContain('"שיעור ערב" עם הרב לוי');
    // 17:30Z is 19:30 in Israel, whatever zone the browser is in.
    expect(scheduled.body).toContain("19:30");
    expect(scheduled.href).toBe("/sessions");
    expect(describeNotification({ type: "session_reminder", payload }).title).toBe("המפגש מתחיל בעוד כרבע שעה");
    expect(describeNotification({ type: "session_starting", payload }).title).toBe("המפגש התחיל");
  });

  it("names the course a session is held for", () => {
    const n = describeNotification({ type: "session_starting", payload: { title: "ערב", hostName: "הרב", courseTitle: "גמרא" } });
    expect(n.body).toBe('"ערב" עם הרב · גמרא');
  });

  it("links a new lesson to its page and names the course", () => {
    const n = describeNotification({ type: "new_lesson", payload: { mediaId: 3, title: "דף ב", courseTitle: "גמרא" } });
    expect(n).toEqual({ title: "שיעור חדש בקורס", body: '"דף ב" · גמרא', href: "/media/3" });
  });

  // A server deployed ahead of this client must not produce a count over an
  // empty list.
  it("renders an unknown type generically instead of dropping it", () => {
    expect(describeNotification({ type: "from_the_future", payload: {} })).toEqual({ title: "התראה", body: "", href: null });
  });
});

describe("notificationAge", () => {
  const now = Date.parse("2026-11-01T12:00:00Z");
  const ago = (ms) => new Date(now - ms).toISOString();

  it("reads the recent ones relatively", () => {
    expect(notificationAge(ago(10_000), now)).toBe("עכשיו");
    expect(notificationAge(ago(60_000), now)).toBe("לפני דקה");
    expect(notificationAge(ago(5 * 60_000), now)).toBe("לפני 5 דקות");
    expect(notificationAge(ago(60 * 60_000), now)).toBe("לפני שעה");
    expect(notificationAge(ago(3 * 60 * 60_000), now)).toBe("לפני 3 שעות");
  });

  it("gives the date for anything older than a day", () => {
    expect(notificationAge(ago(3 * 24 * 60 * 60_000), now)).toBe("29 באוקטובר 2026");
  });

  it("is empty for a value that is not a date", () => {
    expect(notificationAge("nonsense", now)).toBe("");
  });
});

// Joining a course by its code (PRD ROST-9).
describe("course join notifications", () => {
  it("tells the lecturer who asked, and sends them to manage the course", () => {
    const n = describeNotification({ type: "course_join_request", payload: { requesterName: "דנה", courseTitle: "גמרא" } });
    expect(n.body).toContain("דנה");
    expect(n.body).toContain("גמרא");
    expect(n.href).toBe("/courses");
  });

  it("tells the student the answer, either way, and sends them to their courses", () => {
    const yes = describeNotification({ type: "course_join_approved", payload: { courseTitle: "גמרא" } });
    const no = describeNotification({ type: "course_join_rejected", payload: { courseTitle: "גמרא" } });
    expect(yes.title).toBe("התקבלת לקורס");
    expect(no.title).toBe("הבקשה להצטרף לא אושרה");
    expect([yes.href, no.href]).toEqual(["/my-courses", "/my-courses"]);
  });
});
