import { createSlice } from "@reduxjs/toolkit";
import { fetchAllCourses, fetchMyCourses, fetchCourseStudents, fetchMyStudents, fetchJoinRequests, fetchMyJoinRequests } from "./coursesSliceGet";
import { createCourse, enrollStudent, createJoinCode, decideJoinRequest } from "./coursesSlicePost";
import { updateCourse } from "./coursesSlicePut";
import { deleteCourse, unenrollStudent, removeJoinCode, cancelJoinRequest } from "./coursesSliceDelete";
import { statuses } from "../../../utilities/constant";

// `studentsByCourse` is a map rather than a list on the selected course: the
// roster is loaded per course on demand, and hanging it off whichever course
// happens to be selected would drop it the moment the selection changed.
const coursesSlice = createSlice({
  name: "courses",
  initialState: {
    items: [],
    myCourses: [],
    // Its own status, not the shared one: `status` tracks the management screen's
    // full catalogue fetch, and a student's page never issues that request — so
    // reading it would leave them on an idle spinner forever.
    myCoursesStatus: statuses.idle,
    studentsByCourse: {},
    // Flat, not keyed by course: this is "everyone who learns with me", which is
    // a different question from studentsByCourse's "who is in course N".
    myStudents: [],
    // Joining by code (PRD ROST-9). The lecturer's queues, by course like the
    // rosters; and the caller's own requests still waiting.
    joinRequestsByCourse: {},
    myJoinRequests: [],
    status: statuses.idle,
    error: null,
  },
  reducers: {
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllCourses.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchAllCourses.fulfilled, (state, action) => { state.status = statuses.succeeded; state.items = action.payload; })
      .addCase(fetchAllCourses.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload?.message; })

      .addCase(fetchMyCourses.pending, (state) => { state.myCoursesStatus = statuses.loading; })
      .addCase(fetchMyCourses.fulfilled, (state, action) => {
        state.myCoursesStatus = statuses.succeeded;
        state.myCourses = action.payload;
      })
      .addCase(fetchMyCourses.rejected, (state, action) => {
        state.myCoursesStatus = statuses.failed;
        state.error = action.payload?.message;
      })

      .addCase(fetchCourseStudents.fulfilled, (state, action) => {
        state.studentsByCourse[action.payload.courseId] = action.payload.students;
      })

      .addCase(createCourse.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(createCourse.rejected, (state, action) => { state.error = action.payload?.message; })

      .addCase(updateCourse.fulfilled, (state, action) => {
        const idx = state.items.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(updateCourse.rejected, (state, action) => { state.error = action.payload?.message; })

      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload.id);
        delete state.studentsByCourse[action.payload.id];
      })
      .addCase(deleteCourse.rejected, (state, action) => { state.error = action.payload?.message; })

      // Both enrollment changes also move student_count, which the card shows —
      // so the course row is patched alongside the roster rather than waiting
      // for the next full fetch.
      .addCase(enrollStudent.fulfilled, (state, action) => {
        const { courseId, students } = action.payload;
        state.studentsByCourse[courseId] = students;
        const course = state.items.find((c) => c.id === Number(courseId));
        if (course) course.student_count = students.length;
      })
      .addCase(enrollStudent.rejected, (state, action) => { state.error = action.payload?.message; })

      .addCase(unenrollStudent.fulfilled, (state, action) => {
        const { courseId, studentId } = action.payload;
        const roster = state.studentsByCourse[courseId];
        if (roster) {
          state.studentsByCourse[courseId] = roster.filter((s) => s.id !== Number(studentId));
          const course = state.items.find((c) => c.id === Number(courseId));
          if (course) course.student_count = state.studentsByCourse[courseId].length;
        }
      })
      .addCase(unenrollStudent.rejected, (state, action) => { state.error = action.payload?.message; })

      // A flat list, separate from studentsByCourse: that map answers "who is in
      // this course", this answers "who learns with me at all". One is keyed by
      // course, the other is not keyed at all.
      .addCase(fetchMyStudents.fulfilled, (state, action) => { state.myStudents = action.payload; })
      .addCase(fetchMyStudents.rejected, (state, action) => { state.error = action.payload?.message; })

      // ── Joining by code (PRD ROST-9) ──
      // The course row carries the code and the waiting count (the header's
      // chip), so both are patched here rather than refetching the catalogue.
      .addCase(createJoinCode.fulfilled, (state, action) => {
        const course = state.items.find((c) => c.id === Number(action.payload.courseId));
        if (course) course.join_code = action.payload.joinCode;
      })
      .addCase(removeJoinCode.fulfilled, (state, action) => {
        const course = state.items.find((c) => c.id === Number(action.payload.courseId));
        if (course) course.join_code = null;
      })
      .addCase(fetchJoinRequests.fulfilled, (state, action) => {
        const { courseId, requests } = action.payload;
        state.joinRequestsByCourse[courseId] = requests;
        const course = state.items.find((c) => c.id === Number(courseId));
        if (course) course.pending_join_count = requests.length;
      })
      .addCase(decideJoinRequest.fulfilled, (state, action) => {
        const { courseId, requestId, approve, students } = action.payload;
        const queue = state.joinRequestsByCourse[courseId] ?? [];
        state.joinRequestsByCourse[courseId] = queue.filter((r) => r.id !== Number(requestId));
        const course = state.items.find((c) => c.id === Number(courseId));
        if (course) course.pending_join_count = state.joinRequestsByCourse[courseId].length;
        if (approve && students) {
          state.studentsByCourse[courseId] = students;
          if (course) course.student_count = students.length;
        }
      })
      // A code typed in (joinCourseByCode) changes nothing here: the page reads
      // this list again, since only the server knows the new request's id.
      .addCase(fetchMyJoinRequests.fulfilled, (state, action) => { state.myJoinRequests = action.payload; })
      .addCase(cancelJoinRequest.fulfilled, (state, action) => {
        state.myJoinRequests = state.myJoinRequests.filter((r) => r.id !== Number(action.payload.requestId));
      });
  },
});

export const { clearError } = coursesSlice.actions;
export default coursesSlice.reducer;
