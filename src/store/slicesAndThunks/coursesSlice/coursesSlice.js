import { createSlice } from "@reduxjs/toolkit";
import { fetchAllCourses, fetchMyCourses, fetchCourseStudents } from "./coursesSliceGet";
import { createCourse, enrollStudent } from "./coursesSlicePost";
import { updateCourse } from "./coursesSlicePut";
import { deleteCourse, unenrollStudent } from "./coursesSliceDelete";
import { statuses } from "../../../utilities/constant";

// `studentsByCourse` is a map rather than a list on the selected course: the
// roster is loaded per course on demand, and hanging it off whichever course
// happens to be selected would drop it the moment the selection changed.
const coursesSlice = createSlice({
  name: "courses",
  initialState: {
    items: [],
    myCourses: [],
    studentsByCourse: {},
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
      .addCase(fetchAllCourses.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; })

      .addCase(fetchMyCourses.fulfilled, (state, action) => { state.myCourses = action.payload; })

      .addCase(fetchCourseStudents.fulfilled, (state, action) => {
        state.studentsByCourse[action.payload.courseId] = action.payload.students;
      })

      .addCase(createCourse.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      .addCase(createCourse.rejected, (state, action) => { state.error = action.payload; })

      .addCase(updateCourse.fulfilled, (state, action) => {
        const idx = state.items.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(updateCourse.rejected, (state, action) => { state.error = action.payload; })

      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload.id);
        delete state.studentsByCourse[action.payload.id];
      })
      .addCase(deleteCourse.rejected, (state, action) => { state.error = action.payload; })

      // Both enrollment changes also move student_count, which the card shows —
      // so the course row is patched alongside the roster rather than waiting
      // for the next full fetch.
      .addCase(enrollStudent.fulfilled, (state, action) => {
        const { courseId, students } = action.payload;
        state.studentsByCourse[courseId] = students;
        const course = state.items.find((c) => c.id === Number(courseId));
        if (course) course.student_count = students.length;
      })
      .addCase(enrollStudent.rejected, (state, action) => { state.error = action.payload; })

      .addCase(unenrollStudent.fulfilled, (state, action) => {
        const { courseId, studentId } = action.payload;
        const roster = state.studentsByCourse[courseId];
        if (roster) {
          state.studentsByCourse[courseId] = roster.filter((s) => s.id !== Number(studentId));
          const course = state.items.find((c) => c.id === Number(courseId));
          if (course) course.student_count = state.studentsByCourse[courseId].length;
        }
      })
      .addCase(unenrollStudent.rejected, (state, action) => { state.error = action.payload; });
  },
});

export const { clearError } = coursesSlice.actions;
export default coursesSlice.reducer;
