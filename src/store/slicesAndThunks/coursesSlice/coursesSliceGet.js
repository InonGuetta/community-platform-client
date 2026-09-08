import { createAsyncThunk } from "@reduxjs/toolkit";
import { coursesApi } from "../../../api/coursesApi";
import { rejectionOf } from "../../../utilities/apiError";

export const fetchAllCourses = createAsyncThunk("courses/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return await coursesApi.getAll();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch courses"));
  }
});

export const fetchMyCourses = createAsyncThunk("courses/fetchMine", async (_, { rejectWithValue }) => {
  try {
    return await coursesApi.getMine();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch your courses"));
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
      return rejectWithValue(rejectionOf(err, "Failed to fetch enrolled students"));
    }
  }
);

// Every distinct person enrolled in any course this lecturer teaches.
//
// Kept out of the enrolment-per-course state: that is keyed by course id and
// answers "who is in THIS course", while this answers "who learns with me at
// all" and is one flat list. Merging them would mean the second view
// recomputing the first every render from data it does not have.
export const fetchMyStudents = createAsyncThunk(
  "courses/myStudents",
  async (_, { rejectWithValue }) => {
    try {
      return await coursesApi.getMyStudents();
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to load your students"));
    }
  }
);

