import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Box from "@mui/material/Box";
import VideoRoom from "../../features/VideoRoom/VideoRoom";
import { selectUser } from "../../../store/selectors/authSelectors";

const SessionRoom = () => {
  const { roomToken } = useParams();
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  const handleEnd = () => navigate("/sessions");

  return (
    <Box sx={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
      <VideoRoom
        roomToken={roomToken}
        userId={user?.id}
        role={user?.role}
        onEnd={handleEnd}
      />
    </Box>
  );
};

export default SessionRoom;
