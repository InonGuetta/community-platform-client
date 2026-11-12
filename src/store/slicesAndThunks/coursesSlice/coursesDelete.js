import { createApiThunk } from "../../createApiThunk";
import { coursesApi } from "../../../api/coursesApi";

export const deleteCourse = createApiThunk("courses/delete", "Failed to delete course", async (id) => {
  await coursesApi.remove(id);
  return { id };
});

export const unenrollStudent = createApiThunk(
  "courses/unenroll", "Failed to remove student",
  async ({ courseId, studentId }) => {
    await coursesApi.unenroll(courseId, studentId);
    return { courseId, studentId };
  }
);

// ── Joining by code (PRD ROST-9) ────────────────────────────────────────────

export const removeJoinCode = createApiThunk("courses/removeJoinCode", "Failed to turn the join code off", async (courseId) => {
  await coursesApi.removeJoinCode(courseId);
  return { courseId };
});

export const cancelJoinRequest = createApiThunk("courses/cancelJoinRequest", "Failed to cancel the join request", async (requestId) => {
  await coursesApi.cancelJoinRequest(requestId);
  return { requestId };
});
