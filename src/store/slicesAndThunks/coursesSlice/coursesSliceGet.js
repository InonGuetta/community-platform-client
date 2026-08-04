import { createAsyncThunk } from "@reduxjs/toolkit";
import { coursesApi } from "../../../api/coursesApi";

export const fetchAllCourses = createAsyncThunk("courses/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return await coursesApi.getAll();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch courses");
  }
});

export const fetchMyCourses = createAsyncThunk("courses/fetchMine", async (_, { rejectWithValue }) => {
  try {
    return await coursesApi.getMine();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch your courses");
  }
});

// Keyed by course id in the slice: the management screen shows one roster at a
// time, but switching courses shouldn't refetch one it already has.
export const fetchCourseStudents = createAsyncThunk(
  "courses/fetchStudents",
  async (courseId, { rejectWithValue }) => {
    try {
      return { courseId, students: await coursesApi.getStudents(courseId) };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch enrolled students");
    }
  }
);
