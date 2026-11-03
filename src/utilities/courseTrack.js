// A course as a track (PRD CRS-1, CRS-2, CRS-3) — the words and the arithmetic,
// apart from any page, so the course page and the lesson page say the same
// thing about the same lesson.
//
// The lessons arrive from GET /courses/:id/lessons already in track order, each
// with the reader's own `last_position_seconds` and `completed_at` (migration
// 043: stamped at nine tenths of a recording and never cleared).

export const trackPath = (courseId) => `/my-courses/${courseId}`;

// What one lesson is, for this reader. A book is read, not finished: it is in
// the track and not in its count.
export const lessonStatus = (lesson) => {
  if (lesson.media_type === "text") return "book";
  if (lesson.completed_at) return "done";
  if (lesson.last_position_seconds > 0) return "started";
  return "new";
};

// "3 מתוך 10 שיעורים" — or nothing for a course of books only.
export const progressText = ({ total, completed }) => {
  if (!total) return "";
  if (completed >= total) return total === 1 ? "השיעור הושלם" : `כל ${total} השיעורים הושלמו`;
  return `${completed} מתוך ${total} שיעורים הושלמו`;
};

export const progressPercent = ({ total, completed }) => (total ? Math.round((completed / total) * 100) : 0);

// Where a lesson stands in the track: { index (1-based), count } — or null for a
// lesson not in it.
export const placeInTrack = (lessons, id) => {
  const at = lessons.findIndex((l) => l.id === Number(id));
  return at === -1 ? null : { index: at + 1, count: lessons.length };
};

// The lesson after this one in the track, whatever it is — the track is
// followed in its order. Null at the end, or for a lesson not in it.
export const nextAfter = (lessons, id) => {
  const at = lessons.findIndex((l) => l.id === Number(id));
  return at === -1 ? null : lessons[at + 1] ?? null;
};
