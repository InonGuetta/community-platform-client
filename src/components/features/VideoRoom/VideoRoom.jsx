import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import ParticipantGrid from "./ParticipantGrid";
import { useVideoRoom } from "./useVideoRoom";

// Presentation only — every piece of signalling now lives in useVideoRoom, and
// the peer bookkeeping under it in peerMesh, where it can be tested without a
// browser or a camera.
const VideoRoom = ({ roomToken, role, onEnd }) => {
  const { streams, connected, mediaError, roomError, endSession, leave } = useVideoRoom({ roomToken, onEnd });

  const canEndSession = role === "lecturer" || role === "admin";
  // Always counts the local participant, who has no tile when their camera was
  // refused — the old count read "0 משתתפים" to someone who was plainly in the room.
  const participantCount = streams.filter((s) => s.id !== "local").length + 1;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "grey.950" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, bgcolor: "grey.900" }}>
        <Typography variant="body2" color="grey.400">חדר: {roomToken}</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {connected && <Typography variant="body2" color="success.main">{participantCount} משתתפים</Typography>}
          {canEndSession ? (
            <Button size="small" variant="contained" color="error" onClick={endSession}>סיום מפגש</Button>
          ) : (
            <Button size="small" variant="outlined" color="warning" onClick={leave}>עזיבה</Button>
          )}
        </Box>
      </Box>

      {roomError && (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography color="error.main" fontWeight={600}>{roomError}</Typography>
          <Button size="small" variant="outlined" onClick={leave} sx={{ mt: 1 }}>
            חזרה למפגשים
          </Button>
        </Box>
      )}

      {mediaError && (
        <Alert severity="warning" sx={{ m: 1 }}>{mediaError}</Alert>
      )}

      <Box sx={{ flex: 1, p: 1 }}>
        <ParticipantGrid streams={streams} />
      </Box>
    </Box>
  );
};

export default VideoRoom;
