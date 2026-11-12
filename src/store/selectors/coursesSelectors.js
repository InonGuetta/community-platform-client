import { createSelector } from "@reduxjs/toolkit";
import { selectUser } from "./authSelectors";
import { canManageCourse } from "../../utilities/permissions";

const selectCoursesState = (state) => state.courses;

export const selectAllCourses = createSelector(selectCoursesState, (c) => c.items);
export const selectMyCourses = createSelector(selectCoursesState, (c) => c.myCourses);
export const selectCoursesStatus = createSelector(selectCoursesState, (c) => c.status);
export const selectCoursesError = createSelector(selectCoursesState, (c) => c.error);

// Only courses still running — what the upload dialog and the archive filter
// should offer. An archived course keeps its lessons but stops being a choice.
export const selectActiveCourses = createSelector(selectAllCourses, (items) =>
  items.filter((c) => c.is_active)
);

// The active courses the signed-in user may file a lesson into — the same rule
// the server applies to an upload's courseId (canManageCourse).
export const selectAssignableCourses = createSelector(selectActiveCourses, selectUser, (items, user) =>
  items.filter((c) => canManageCourse(user, c))
);

// A factory, not a selector: the roster is per course, so the caller supplies
// the id. Returns a stable [] for a course whose roster hasn't been fetched, so
// a component can map over it without a null check.
export const selectCourseStudents = (courseId) =>
  createSelector(selectCoursesState, (c) => c.studentsByCourse[courseId] ?? EMPTY);

const EMPTY = [];

// The lecturer's students across their courses, the student's own courses'
// status, the join requests they have sent, and one course's waiting requests.
export const selectMyStudents = (state) => state.courses.myStudents;
export const selectMyCoursesStatus = (state) => state.courses.myCoursesStatus;
export const selectMyJoinRequests = (state) => state.courses.myJoinRequests;
export const selectJoinRequestsFor = (courseId) => (state) => state.courses.joinRequestsByCourse[courseId];
