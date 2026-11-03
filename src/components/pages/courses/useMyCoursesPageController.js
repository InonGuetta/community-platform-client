import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchMyCourses, fetchMyJoinRequests } from "../../../store/slicesAndThunks/coursesSlice/coursesSliceGet";
import { joinCourseByCode } from "../../../store/slicesAndThunks/coursesSlice/coursesSlicePost";
import { cancelJoinRequest } from "../../../store/slicesAndThunks/coursesSlice/coursesSliceDelete";
import { ERROR_CODES, hebrewForError } from "../../../utilities/apiError";
import { statuses } from "../../../utilities/constant";

// The student's own courses: the fetch and the selection, so MyCoursesPage.jsx is
// layout only (the useXxxPageController rule).
//
// And joining one by its code (PRD ROST-9): the dialog's state, the requests
// still waiting for the lecturer, and the lecturer's shared link —
// /my-courses?join=CODE opens the dialog with the code already typed.
export const JOIN_PARAM = "join";

export const useMyCoursesPageController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const courses = useSelector((state) => state.courses.myCourses);
  const status = useSelector((state) => state.courses.myCoursesStatus);
  const pendingRequests = useSelector((state) => state.courses.myJoinRequests);

  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [joined, setJoined] = useState(null);

  useEffect(() => {
    dispatch(fetchMyCourses());
    dispatch(fetchMyJoinRequests());
  }, [dispatch]);

  // The shared link. The code is taken off the address once read, so a reload
  // or a bookmark of the page does not reopen the dialog every time.
  const linkCode = searchParams.get(JOIN_PARAM);
  useEffect(() => {
    if (!linkCode) return;
    setCode(linkCode.toUpperCase());
    setJoinError(null);
    setJoined(null);
    setJoinOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete(JOIN_PARAM);
    setSearchParams(next, { replace: true });
  }, [linkCode]); // eslint-disable-line react-hooks/exhaustive-deps -- runs once per code in the address

  const openJoin = () => {
    setCode("");
    setJoinError(null);
    setJoined(null);
    setJoinOpen(true);
  };

  const submitJoin = async () => {
    setSubmitting(true);
    setJoinError(null);
    const result = await dispatch(joinCourseByCode(code));
    setSubmitting(false);
    if (result.meta.requestStatus === "fulfilled") {
      setJoined(result.payload.course);
      dispatch(fetchMyJoinRequests());
      return;
    }
    setJoinError(hebrewForError(result.payload, "השליחה נכשלה. נסו שוב."));
    // Enrolled after all (by the lecturer, or in another tab): make sure the
    // list shows the course the message just said they are in.
    if (result.payload?.code === ERROR_CODES.ALREADY_ENROLLED) dispatch(fetchMyCourses());
  };

  // The first load, before there is anything to show. A refetch over a list
  // already on screen keeps the list rather than flashing a spinner.
  const loadingFirstTime = status === statuses.loading && courses.length === 0;

  return {
    courses,
    navigate,
    loadingFirstTime,
    pendingRequests,
    cancelRequest: (id) => dispatch(cancelJoinRequest(id)),
    join: {
      open: joinOpen,
      code,
      onCodeChange: setCode,
      submitting,
      error: joinError,
      joined,
      onSubmit: submitJoin,
      onClose: () => setJoinOpen(false),
    },
    openJoin,
  };
};
