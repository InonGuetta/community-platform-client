import { createAsyncThunk } from "@reduxjs/toolkit";
import { coursesApi } from "../../../api/coursesApi";
import { rejectionOf } from "../../../utilities/apiError";

export const deleteCourse = createAsyncThunk("courses/delete", async (id, { rejectWithValue }) => {
  try {
    await coursesApi.remove(id);
    return { id };
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to delete course"));
  }
});

export const unenrollStudent = createAsyncThunk(
  "courses/unenroll",
  async ({ courseId, studentId }, { rejectWithValue }) => {
    try {
      await coursesApi.unenroll(courseId, studentId);
      return { courseId, studentId };
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to remove student"));
    }
  }
);
