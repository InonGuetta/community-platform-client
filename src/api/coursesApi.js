import axiosInstance from "../utilities/axiosInstance";

// Courses and enrollments. Unlike media and users, these routes are REST with no
// verb in the path — the notes/bookmarks shape rather than the media one.
//
// Enrollment lives here too rather than in a module of its own: it has no
// endpoints outside a course's own path, so splitting it would produce a file
// whose every URL began with /courses/:id.
export const coursesApi = {
  getAll: async () => (await axiosInstance.get("/courses")).data,

  getOne: async (id) => (await axiosInstance.get(`/courses/${id}`)).data,

  // The signed-in user's own enrollments. Students have no other way to ask —
  // the by-id route below is admin-or-self and needs an id they may not know.
  getMine: async () => (await axiosInstance.get("/courses/my")).data,

  create: async (payload) => (await axiosInstance.post("/courses", payload)).data,

  update: async (id, payload) => (await axiosInstance.put(`/courses/${id}`, payload)).data,

  remove: async (id) => {
    await axiosInstance.delete(`/courses/${id}`);
  },

  // ── enrollments ──────────────────────────────────────────────────────────
  getStudents: async (courseId) =>
    (await axiosInstance.get(`/courses/${courseId}/students`)).data,

  enroll: async (courseId, studentId) =>
    (await axiosInstance.post(`/courses/${courseId}/students`, { studentId })).data,

  unenroll: async (courseId, studentId) => {
    await axiosInstance.delete(`/courses/${courseId}/students/${studentId}`);
  },

  // Who this lecturer teaches, across every course they run. No id in the path
  // on purpose — the server answers for the CALLER, which is what makes it safe
  // to expose to a lecturer at all: there is no parameter to point elsewhere.
  getMyStudents: async () => (await axiosInstance.get("/courses/my-students")).data,

  // The type-ahead behind "add a student". The server answers an empty list
  // below two characters and caps the result at twenty, so this is a search and
  // not a membership dump — do not be tempted to call it with an empty q to
  // "just get everyone".
  searchEnrollable: async (courseId, q) =>
    (await axiosInstance.get(`/courses/${courseId}/enrollable-students`, { params: { q } })).data,

  getStudentCourses: async (studentId) =>
    (await axiosInstance.get(`/courses/students/${studentId}/enrollments`)).data,

  // ── the course as a track (PRD CRS-1..3) ─────────────────────────────────
  // { course, lessons (in order, each with the caller's progress), summary,
  //   canArrange }. 403 for a student not enrolled in the course.
  getLessons: async (courseId) => (await axiosInstance.get(`/courses/${courseId}/lessons`)).data,
  // Every lesson of the course, in the new order.
  reorderLessons: async (courseId, mediaIds) =>
    (await axiosInstance.put(`/courses/${courseId}/lessons/order`, { mediaIds })).data,

  // ── joining by code (PRD ROST-9) ─────────────────────────────────────────
  // The lecturer's side: the code (a new one replaces the old at once) and the
  // queue of people waiting.
  createJoinCode: async (courseId) => (await axiosInstance.post(`/courses/${courseId}/join-code`)).data,
  removeJoinCode: async (courseId) => (await axiosInstance.delete(`/courses/${courseId}/join-code`)).data,
  getJoinRequests: async (courseId) => (await axiosInstance.get(`/courses/${courseId}/join-requests`)).data,
  decideJoinRequest: async (courseId, requestId, approve) =>
    (await axiosInstance.post(`/courses/${courseId}/join-requests/${requestId}/${approve ? "approve" : "reject"}`)).data,

  // The student's side: typing a code files a request (answered 202 with the
  // course it opened); their own waiting requests, and withdrawing one.
  join: async (code) => (await axiosInstance.post("/courses/join", { code })).data,
  getMyJoinRequests: async () => (await axiosInstance.get("/courses/join-requests/mine")).data,
  cancelJoinRequest: async (requestId) => {
    await axiosInstance.delete(`/courses/join-requests/${requestId}`);
  },
};
