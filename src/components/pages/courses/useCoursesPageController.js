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

const useCoursesPageController = () => {
  const dispatch = useDispatch();
  const courses = useSelector(selectAllCourses);
  const status = useSelector(selectCoursesStatus);
  const allUsers = useSelector(selectAllUsers);
  const currentUser = useSelector(selectUser);
  const myStudents = useSelector((state) => state.courses.myStudents);
  const isAdmin = currentUser?.role === roles.admin;

  const [createOpen, setCreateOpen] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [rosterCourseId, setRosterCourseId] = useState(null);

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

  // Fetch a roster the first time its course is opened.
  useEffect(() => {
    if (rosterCourseId !== null) dispatch(fetchCourseStudents(rosterCourseId));
  }, [rosterCourseId, dispatch]);

  const lecturers = allUsers.filter(
    (u) => u.is_active && (u.role === roles.lecturer || u.role === roles.admin)
  );

  // A lecturer manages only their own courses; an admin sees every course as
  // manageable. Mirrors canManageMedia, but reads lecturer_id off a course row.
  const canManage = (course) =>
    isAdmin || Number(course?.lecturer_id) === Number(currentUser?.id);

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

  const handleEnroll = (courseId, studentId) =>
    dispatch(enrollStudent({ courseId, studentId }));

  const handleUnenroll = (courseId, studentId) =>
    dispatch(unenrollStudent({ courseId, studentId }));

  return {
    courses, status, lecturers, isAdmin, canManage, myStudents,
    createOpen, setCreateOpen,
    editCourse, setEditCourse,
    deleteTarget, setDeleteTarget,
    rosterCourseId, setRosterCourseId,
    handleCreate, handleUpdate, handleDeleteConfirm, handleEnroll, handleUnenroll,
  };
};

export default useCoursesPageController;
