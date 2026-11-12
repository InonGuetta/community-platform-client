import { createApiThunk } from "../../createApiThunk";
import { coursesApi } from "../../../api/coursesApi";

export const createCourse = createApiThunk("courses/create", "Failed to create course", async (payload) => {
  return await coursesApi.create(payload);
});

export const enrollStudent = createApiThunk(
  "courses/enroll", "Failed to enroll student",
  async ({ courseId, studentId }) => {
    await coursesApi.enroll(courseId, studentId);
    // The enrollment row carries no display name, and the roster is rendered
    // from user rows — so re-read it rather than pushing a half-populated entry.
    return { courseId, students: await coursesApi.getStudents(courseId) };
  }
);

// ── Joining by code (PRD ROST-9) ────────────────────────────────────────────

export const createJoinCode = createApiThunk(
  "courses/createJoinCode", "Failed to create a join code",
  async (courseId) => {
    const { joinCode } = await coursesApi.createJoinCode(courseId);
    return { courseId, joinCode };
  }
);

// Approving enrols on the server, so the roster is read again with it — the
// same reason enrollStudent re-reads it.
export const decideJoinRequest = createApiThunk(
  "courses/decideJoinRequest", "Failed to decide the join request",
  async ({ courseId, requestId, approve }) => {
    await coursesApi.decideJoinRequest(courseId, requestId, approve);
    const students = approve ? await coursesApi.getStudents(courseId) : null;
    return { courseId, requestId, approve, students };
  }
);

// The answer names the course and its lecturer, which the dialog says back.
export const joinCourseByCode = createApiThunk("courses/join", "Failed to join the course", async (code) => {
  return await coursesApi.join(code);
});
