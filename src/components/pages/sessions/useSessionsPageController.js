import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchActiveSessions, fetchUpcomingSessions } from "../../../store/slicesAndThunks/sessionsSlice/sessionsGet";
import { createSession, startSession } from "../../../store/slicesAndThunks/sessionsSlice/sessionsPost";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { selectAllRooms, selectSessionsStatus } from "../../../store/selectors/sessionsSelectors";
import { hebrewForError } from "../../../utilities/apiError";
import { selectUser } from "../../../store/selectors/authSelectors";
import { isPrivileged } from "../../../utilities/permissions";
import { fetchAllCourses } from "../../../store/slicesAndThunks/coursesSlice/coursesSliceGet";
import { selectAssignableCourses } from "../../../store/selectors/coursesSelectors";

const useSessionsPageController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const rooms = useSelector(selectAllRooms);
  const upcoming = useSelector((state) => state.sessions.upcoming);
  const status = useSelector(selectSessionsStatus);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  // The courses a session may be held for (PRD D8) — the same list, and the
  // same rule, as filing a lesson: the server refuses any other.
  const courses = useSelector(selectAssignableCourses);

  // Only when the dialog opens, like the upload dialog: the sessions list
  // itself has no use for the courses.
  useEffect(() => {
    if (createDialogOpen) dispatch(fetchAllCourses());
  }, [createDialogOpen, dispatch]);

  useEffect(() => {
    dispatch(fetchActiveSessions());
    dispatch(fetchUpcomingSessions());
  }, [dispatch]);

  // By id. The room token is no longer part of a session as the client sees it —
  // SessionRoom asks the server for one on arrival.
  const handleJoinRoom = (id) => navigate(`/sessions/${id}`);

  // Opening a scheduled room, then walking into it. Two steps because they are
  // two decisions: a host may open a room minutes before saying anything in it,
  // and the people waiting need it open to get in.
  const handleStartSession = async (id) => {
    const result = await dispatch(startSession(id));
    if (result.meta.requestStatus === "fulfilled") {
      navigate(`/sessions/${id}`);
      return;
    }
    dispatch(notify({
      message: hebrewForError(result.payload, "לא ניתן לפתוח את המפגש"),
      severity: "error",
    }));
  };

  // courseId is left out rather than sent empty when no course is chosen: a
  // general session, whose notices go to the host's students.
  const handleCreateSession = async ({ courseId, ...data }) => {
    const result = await dispatch(createSession(courseId ? { ...data, courseId: Number(courseId) } : data));
    if (result.meta.requestStatus !== "fulfilled") return;

    setCreateDialogOpen(false);
    // A session created for later is not a room to walk into — it does not have
    // one yet. Sending the host there would land them on "this session has not
    // started", which is a confusing way to confirm that scheduling worked.
    if (result.payload.state === "scheduled") {
      dispatch(notify({ message: "המפגש נקבע ויופיע ברשימת המפגשים הקרובים", severity: "success" }));
      return;
    }
    navigate(`/sessions/${result.payload.id}`);
  };

  // Who may open a room, and which rooms are this user's to start — decided
  // here rather than in the page, which used to select the user itself.
  const user = useSelector(selectUser);
  const canCreate = isPrivileged(user);
  const isHost = (room) => Number(room.host_id) === Number(user?.id);

  return {
    rooms,
    upcoming,
    status,
    canCreate,
    isHost,
    courses,
    createDialogOpen,
    setCreateDialogOpen,
    handleJoinRoom,
    handleStartSession,
    handleCreateSession,
  };
};

export default useSessionsPageController;
