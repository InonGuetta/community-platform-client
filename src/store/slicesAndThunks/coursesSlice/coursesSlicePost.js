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
