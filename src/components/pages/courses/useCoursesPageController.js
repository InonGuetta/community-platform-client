import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllCourses, fetchCourseStudents, fetchMyStudents } from "../../../store/slicesAndThunks/coursesSlice/coursesSliceGet";
import { createCourse, enrollStudent } from "../../../store/slicesAndThunks/coursesSlice/coursesSlicePost";
import { updateCourse } from "../../../store/slicesAndThunks/coursesSlice/coursesSlicePut";
import { deleteCourse, unenrollStudent } from "../../../store/slicesAndThunks/coursesSlice/coursesSliceDelete";
import { fetchAllUsers } from "../../../store/slicesAndThunks/usersSlice/usersSliceGet";
import { selectAllCourses, selectCoursesStatus } from "../../../store/selectors/coursesSelectors";
import { selectAllUsers } from "../../../store/selectors/usersSelectors";
import { selectUser } from "../../../store/selectors/authSelectors";
import { roles } from "../../../utilities/constant";
import { saveBlob } from "../../../utilities/saveBlob";
import { rosterCsv, rosterFileName, CSV_BOM } from "../../../utilities/rosterCsv";

const useCoursesPageController = () => {
  const dispatch = useDispatch();
  const courses = useSelector(selectAllCourses);
  const status = useSelector(selectCoursesStatus);
  const allUsers = useSelector(selectAllUsers);
  const currentUser = useSelector(selectUser);
  const myStudents = useSelector((state) => state.courses.myStudents);
  const isAdmin = currentUser?.role === roles.admin;
  // Only a lecturer has a choice to make: an admin manages every course, so
  // "mine" and "all" would differ only in which ones they happen to teach.
  const isLecturer = currentUser?.role === roles.lecturer;

  const [createOpen, setCreateOpen] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rosterCourseId, setRosterCourseId] = useState(null);
  // ROST-7. "mine" by default: the tab is where a lecturer runs their own
  // teaching, and opening it onto every course in the yeshiva buried those
  // few under everybody else's.
  const [scope, setScope] = useState("mine");
  // { course, student } awaiting confirmation — see handleUnenrollRequest.
  const [unenrollTarget, setUnenrollTarget] = useState(null);

  useEffect(() => {
    dispatch(fetchAllCourses());
    // The lecturer dropdown is built from the user list, and only an admin may
    // read it (/users is admin-only). The ENROLMENT picker no longer comes from
    // here: it searches through /courses/:id/enrollable-students instead, which
    // is what let enrolment open to lecturers without also opening the whole
    // membership list to them.
    if (isAdmin) dispatch(fetchAllUsers());
  }, [dispatch, isAdmin]);

  // Who this lecturer teaches, across all their courses. Fetched for anybody who
  // can manage a course; an admin who teaches nothing simply gets an empty list,
  // which is the honest answer to "who learns with me".
  useEffect(() => {
    dispatch(fetchMyStudents());
  }, [dispatch]);

  // A lecturer manages only their own courses; an admin sees every course as
  // manageable. Mirrors canManageMedia, but reads lecturer_id off a course row.
  const canManage = (course) =>
    isAdmin || Number(course?.lecturer_id) === Number(currentUser?.id);

  // Fetch a roster the first time its course is opened — and only a course this
  // user manages. The server answers 403 for anyone else's (a roster is names
  // and emails), so asking for one opened from "all courses" was a guaranteed
  // error toast on every click.
  const rosterManageable = canManage(courses.find((c) => c.id === rosterCourseId));
  useEffect(() => {
    if (rosterCourseId !== null && rosterManageable) dispatch(fetchCourseStudents(rosterCourseId));
  }, [rosterCourseId, rosterManageable, dispatch]);

  const visibleCourses = isLecturer && scope === "mine" ? courses.filter(canManage) : courses;

  const lecturers = allUsers.filter(
    (u) => u.is_active && (u.role === roles.lecturer || u.role === roles.admin)
  );

  const handleCreate = async (form) => {
    const result = await dispatch(createCourse(form));
    if (result.meta.requestStatus === "fulfilled") setCreateOpen(false);
  };

  const handleUpdate = async (form) => {
    const result = await dispatch(updateCourse({ id: editCourse.id, ...form }));
    if (result.meta.requestStatus === "fulfilled") setEditCourse(null);
  };

  const handleDeleteConfirm = async () => {
    await dispatch(deleteCourse(deleteTarget.id));
    setDeleteTarget(null);
    if (rosterCourseId === deleteTarget.id) setRosterCourseId(null);
  };

  // "My students" is a list across every course, built by the server, and the
  // roster reducers only patch the one course. Without asking again, somebody
  // just added was missing from it — and somebody just removed stayed in it —
  // until the tab was reloaded.
  const refreshMyStudents = (result) => {
    if (result.meta.requestStatus === "fulfilled") dispatch(fetchMyStudents());
    return result;
  };

  const handleEnroll = async (courseId, studentId) =>
    refreshMyStudents(await dispatch(enrollStudent({ courseId, studentId })));

  // ROST-8. Removing somebody used to happen on the X itself, with no second
  // step — and it takes effect at once: the student stops seeing the course's
  // lessons on their next request (ROST-13). One stray click on a chip cost a
  // student their access, silently. So the X only asks.
  const handleUnenrollRequest = (courseId, student) =>
    setUnenrollTarget({ course: courses.find((c) => c.id === courseId), student });
  const handleUnenrollCancel = () => setUnenrollTarget(null);
  const handleUnenrollConfirm = async () => {
    const { course, student } = unenrollTarget;
    setUnenrollTarget(null);
    refreshMyStudents(await dispatch(unenrollStudent({ courseId: course.id, studentId: student.id })));
  };

  // ROST-11. From the roster on screen, which is what the user is looking at
  // and has already been fetched — see rosterCsv.js for why there is no server
  // endpoint for this.
  const handleExportRoster = (course, students) =>
    saveBlob(
      new Blob([CSV_BOM, rosterCsv(students)], { type: "text/csv;charset=utf-8" }),
      rosterFileName(course.title)
    );

  return {
    courses: visibleCourses, totalCourses: courses.length, status, lecturers, isAdmin, canManage, myStudents,
    isLecturer, scope, setScope,
    createOpen, setCreateOpen,
    editCourse, setEditCourse,
    deleteTarget, setDeleteTarget,
    rosterCourseId, setRosterCourseId,
    handleCreate, handleUpdate, handleDeleteConfirm, handleEnroll,
    unenrollTarget, handleUnenrollRequest, handleUnenrollCancel, handleUnenrollConfirm,
    handleExportRoster,
  };
};

export default useCoursesPageController;
