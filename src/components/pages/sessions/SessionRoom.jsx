import { useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Box from "@mui/material/Box";
import VideoRoom from "../../features/VideoRoom/VideoRoom";
import { selectUser } from "../../../store/selectors/authSelectors";

const SessionRoom = () => {
  const { roomToken } = useParams();
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  // useVideoRoom holds this in a ref so it no longer drives the room's
  // lifecycle, but keeping it stable is correct regardless.
  const handleEnd = useCallback(() => navigate("/sessions"), [navigate]);

  return (
    <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      {/* userId is no longer passed: the server takes the identity from the
          signed token rather than from anything the client claims. */}
      <VideoRoom
        roomToken={roomToken}
        role={user?.role}
        onEnd={handleEnd}
      />
    </Box>
  );
};

export default SessionRoom;
