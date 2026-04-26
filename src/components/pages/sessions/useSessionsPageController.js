import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchActiveSessions } from "../../../store/slicesAndThunks/sessionsSlice/sessionsGet";
import { createSession } from "../../../store/slicesAndThunks/sessionsSlice/sessionsPost";
import { selectAllRooms, selectSessionsStatus } from "../../../store/selectors/sessionsSelectors";

const useSessionsPageController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const rooms = useSelector(selectAllRooms);
  const status = useSelector(selectSessionsStatus);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchActiveSessions());
  }, [dispatch]);

  const handleJoinRoom = (roomToken) => navigate(`/sessions/${roomToken}`);

  const handleCreateSession = async (data) => {
    const result = await dispatch(createSession(data));
    if (result.meta.requestStatus === "fulfilled") {
      setCreateDialogOpen(false);
      navigate(`/sessions/${result.payload.room_token}`);
    }
  };

  return { rooms, status, createDialogOpen, setCreateDialogOpen, handleJoinRoom, handleCreateSession };
};

export default useSessionsPageController;
