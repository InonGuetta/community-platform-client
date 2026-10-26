import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchMyCourses } from "../../../store/slicesAndThunks/coursesSlice/coursesSliceGet";
import { statuses } from "../../../utilities/constant";

// The student's own courses: the fetch and the selection, so MyCoursesPage.jsx is
// layout only (the useXxxPageController rule).
export const useMyCoursesPageController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const courses = useSelector((state) => state.courses.myCourses);
  const status = useSelector((state) => state.courses.myCoursesStatus);

  useEffect(() => { dispatch(fetchMyCourses()); }, [dispatch]);

  // The first load, before there is anything to show. A refetch over a list
  // already on screen keeps the list rather than flashing a spinner.
  const loadingFirstTime = status === statuses.loading && courses.length === 0;

  return {
    courses,
    navigate,
    loadingFirstTime,
  };
};
