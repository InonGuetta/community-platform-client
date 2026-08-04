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

  getStudentCourses: async (studentId) =>
    (await axiosInstance.get(`/courses/students/${studentId}/enrollments`)).data,
};
