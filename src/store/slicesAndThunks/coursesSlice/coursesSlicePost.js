import { createAsyncThunk } from "@reduxjs/toolkit";
import { coursesApi } from "../../../api/coursesApi";
import { rejectionOf } from "../../../utilities/apiError";

export const createCourse = createAsyncThunk("courses/create", async (payload, { rejectWithValue }) => {
  try {
    return await coursesApi.create(payload);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to create course"));
  }
});

export const enrollStudent = createAsyncThunk(
  "courses/enroll",
  async ({ courseId, studentId }, { rejectWithValue }) => {
    try {
      await coursesApi.enroll(courseId, studentId);
      // The enrollment row carries no display name, and the roster is rendered
      // from user rows — so re-read it rather than pushing a half-populated entry.
      return { courseId, students: await coursesApi.getStudents(courseId) };
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to enroll student"));
    }
  }
);

// ── Joining by code (PRD ROST-9) ────────────────────────────────────────────

export const createJoinCode = createAsyncThunk(
  "courses/createJoinCode",
  async (courseId, { rejectWithValue }) => {
    try {
      const { joinCode } = await coursesApi.createJoinCode(courseId);
      return { courseId, joinCode };
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to create a join code"));
    }
  }
);

// Approving enrols on the server, so the roster is read again with it — the
// same reason enrollStudent re-reads it.
export const decideJoinRequest = createAsyncThunk(
  "courses/decideJoinRequest",
  async ({ courseId, requestId, approve }, { rejectWithValue }) => {
    try {
      await coursesApi.decideJoinRequest(courseId, requestId, approve);
      const students = approve ? await coursesApi.getStudents(courseId) : null;
      return { courseId, requestId, approve, students };
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to decide the join request"));
    }
  }
);

// The answer names the course and its lecturer, which the dialog says back.
export const joinCourseByCode = createAsyncThunk("courses/join", async (code, { rejectWithValue }) => {
  try {
    return await coursesApi.join(code);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to join the course"));
  }
});
