import { useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import VideoRoom from "../../features/VideoRoom/VideoRoom";
import { selectUser } from "../../../store/selectors/authSelectors";
import { selectAllRooms } from "../../../store/selectors/sessionsSelectors";
import { fetchActiveSessions } from "../../../store/slicesAndThunks/sessionsSlice/sessionsGet";

const SessionRoom = () => {
  const { roomToken } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const rooms = useSelector(selectAllRooms);

  const room = rooms.find((r) => r.room_token === roomToken);

  // Reaching this page by deep link or a refresh means the sessions list was
  // never fetched, so the room — and with it the host check below — is unknown.
  // Creating a session puts the new room straight into the store, so that path
  // never gets here. One attempt per token: if the room genuinely isn't active,
  // re-fetching on every render would spin.
  const requestedRef = useRef(null);
  useEffect(() => {
    if (room || requestedRef.current === roomToken) return;
    requestedRef.current = roomToken;
    dispatch(fetchActiveSessions());
  }, [room, roomToken, dispatch]);

  // useVideoRoom holds this in a ref so it no longer drives the room's
  // lifecycle, but keeping it stable is correct regardless.
  const handleEnd = useCallback(() => navigate("/sessions"), [navigate]);

  // False until the room is known, which is the safe direction: the worst case
  // is a host who briefly sees "עזיבה" instead of "סיום מפגש", rather than a
  // guest offered a button the server refuses.
  const isHost = Boolean(room) && Number(room.host_id) === Number(user?.id);

  return (
    <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      {/* userId is no longer passed: the server takes the identity from the
          signed token rather than from anything the client claims. */}
      <VideoRoom
        roomToken={roomToken}
        isHost={isHost}
        onEnd={handleEnd}
      />
    </Box>
  );
};

export default SessionRoom;
