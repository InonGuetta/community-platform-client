import { roles, defaultCreatorName } from "../../../utilities/constant";

// The rules the upload form and the edit dialog share, kept out of both so the
// two cannot answer the same question differently — and so they can be tested
// without rendering either.

// Which ACCOUNT a lesson credits — media_items.lecturer_id. Not the name on the
// card: that is creator_name, free text, "who said it". This is "which lecturer
// is responsible", and the server has accepted it on every upload since courses
// existed while the form never sent it, so every row held NULL.
//
// The course's lecturer when the lesson is filed in a course that has one —
// a lesson in a course is that course's teaching. Otherwise the lecturer doing
// the upload. An admin uploading into the general library is neither, and
// undefined leaves the field out of the request: the server then falls back to
// the uploader when it displays it.
export const lecturerIdFor = (user, course) => {
  const teacher = Number(course?.lecturer_id);
  if (Number.isInteger(teacher) && teacher > 0) return teacher;
  if (user?.role === roles.lecturer) return Number(user.id);
  return undefined;
};

// An existing lesson, as the values the shared fields component edits.
//
// The default name is shown as an empty field, exactly as the upload form shows
// it: the placeholder says what blank becomes, and a pre-filled "כללי" would read
// as a name somebody chose — and would have to be deleted before typing the real
// one.
export const fieldsFromItem = (item) => ({
  title: item?.title ?? "",
  description: item?.description ?? "",
  mediaType: item?.media_type ?? "video",
  courseId: item?.course_id ?? "",
  creatorName: item?.creator_name === defaultCreatorName ? "" : item?.creator_name ?? "",
});

// Only what the editor actually changed.
//
// Not an optimisation. The server re-checks a course whenever courseId is in
// the body, so re-sending an unchanged one refuses the whole edit for anybody
// who may edit the lesson but not manage the course it sits in — a typo in the
// title would become unfixable. Presence in the body is also what the server
// reads as "change this" (see updateMedia there), so an unchanged field must be
// absent rather than sent with its old value.
//
// `courses` is the list the course field offered; it supplies the lecturer of a
// newly chosen course.
export const editChanges = (item, fields, user, courses = []) => {
  const changes = {};

  const title = fields.title.trim();
  if (title !== item.title) changes.title = title;

  if (fields.description !== (item.description ?? "")) changes.description = fields.description;

  // Compared as the server will store it: blank and "כללי" are one value, so
  // opening and saving a lesson credited to nobody sends nothing.
  const creatorName = fields.creatorName.trim();
  if ((creatorName || defaultCreatorName) !== item.creator_name) changes.creatorName = creatorName;

  // As strings: a select hands back what it was given, and an id that has been
  // through JSON is not always the type it started as.
  if (String(fields.courseId ?? "") !== String(item.course_id ?? "")) {
    const courseId = fields.courseId === "" ? null : Number(fields.courseId);
    changes.courseId = courseId;
    // The credited lecturer follows the course, by the same rule as an upload.
    // Only when the course moves: an edit to the title must not quietly
    // re-credit a lesson somebody assigned by hand.
    const course = courses.find((c) => Number(c.id) === courseId);
    const lecturerId = lecturerIdFor(user, course);
    if (lecturerId !== undefined) changes.lecturerId = lecturerId;
  }

  return changes;
};
