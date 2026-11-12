import { createApiThunk } from "../../createApiThunk";
import { coursesApi } from "../../../api/coursesApi";

export const fetchAllCourses = createApiThunk("courses/fetchAll", "Failed to fetch courses", async () => {
  return await coursesApi.getAll();
});

export const fetchMyCourses = createApiThunk("courses/fetchMine", "Failed to fetch your courses", async () => {
  return await coursesApi.getMine();
});

// Keyed by course id in the slice: the management screen shows one roster at a
// time, but switching courses shouldn't refetch one it already has.
export const fetchCourseStudents = createApiThunk(
  "courses/fetchStudents", "Failed to fetch enrolled students",
  async (courseId) => {
    return { courseId, students: await coursesApi.getStudents(courseId) };
  }
);

// Every distinct person enrolled in any course this lecturer teaches.
//
// Kept out of the enrolment-per-course state: that is keyed by course id and
// answers "who is in THIS course", while this answers "who learns with me at
// all" and is one flat list. Merging them would mean the second view
// recomputing the first every render from data it does not have.
export const fetchMyStudents = createApiThunk(
  "courses/myStudents", "Failed to load your students",
  async () => {
    return await coursesApi.getMyStudents();
  }
);


// Joining by code (PRD ROST-9): one course's queue, for its lecturer; and the
// caller's own waiting requests.
export const fetchJoinRequests = createApiThunk(
  "courses/fetchJoinRequests", "Failed to fetch join requests",
  async (courseId) => {
    return { courseId, requests: await coursesApi.getJoinRequests(courseId) };
  }
);

export const fetchMyJoinRequests = createApiThunk("courses/fetchMyJoinRequests", "Failed to fetch your join requests", async () => {
  return await coursesApi.getMyJoinRequests();
});
