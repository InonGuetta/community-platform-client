import { useState } from "react";
import { useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Badge from "@mui/material/Badge";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import ParticipantGrid from "./ParticipantGrid";
import ChatPanel from "./ChatPanel";
import { useVideoRoom } from "./useVideoRoom";
import { selectUser } from "../../../store/selectors/authSelectors";

// Presentation only — every piece of signalling lives in useVideoRoom, and the
// peer bookkeeping under it in peerMesh, where it can be tested without a
// browser or a camera.
const controlSx = (active) => ({
  color: active ? "grey.100" : "error.light",
  bgcolor: active ? "grey.800" : "rgba(211,47,47,0.15)",
  "&:hover": { bgcolor: active ? "grey.700" : "rgba(211,47,47,0.25)" },
});

const VideoRoom = ({ roomToken, isHost, onEnd }) => {
  const {
    streams, connected, mediaError, roomError, endSession, leave,
    micOn, cameraOn, hasMic, hasCamera, sharing, toggleMic, toggleCamera, shareScreen,
    messages, sendMessage,
  } = useVideoRoom({ roomToken, onEnd });

  const user = useSelector(selectUser);
  const [chatOpen, setChatOpen] = useState(false);
  // Cleared by opening the panel, so the badge counts what arrived while it was
  // shut rather than the whole conversation.
  const [seenCount, setSeenCount] = useState(0);
  const unread = chatOpen ? 0 : Math.max(0, messages.length - seenCount);

  const openChat = () => {
    setChatOpen((open) => {
      if (!open) setSeenCount(messages.length);
      return !open;
    });
  };

  // Ending a session is the host's right, not the lecturer role's: the server
  // ends a session only for its own host (the "AND host_id=$2" in the UPDATE),
  // so a lecturer visiting someone else's room used to get a "סיום מפגש" button
  // that answered 403. They get "עזיבה" instead, which is what they can do.
  const canEndSession = Boolean(isHost);
  // Always counts the local participant, who has no tile when their camera was
  // refused — the old count read "0 משתתפים" to someone who was plainly in the room.
  const participantCount = streams.filter((s) => s.id !== "local").length + 1;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "grey.950" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, bgcolor: "grey.900" }}>
        {/* The room token is no longer shown. It is a credential the server hands
            out to enter this room, not a name for it — printing it put it on
            every screenshot of a session. */}
        <Typography variant="body2" color="grey.400">
          {connected ? `${participantCount} משתתפים` : "מתחבר…"}
        </Typography>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
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

      {mediaError && <Alert severity="warning" sx={{ m: 1 }}>{mediaError}</Alert>}

      {/* The grid and the chat sit side by side rather than the chat floating
          over the video: in a study session the text IS content, and covering a
          shared page with it is the one thing it must not do. */}
      <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Box sx={{ flex: 1, p: 1, minWidth: 0 }}>
          <ParticipantGrid streams={streams} />
        </Box>
        {chatOpen && (
          <Box sx={{ width: { xs: "100%", sm: 320 }, flexShrink: 0, borderInlineStart: "1px solid", borderColor: "grey.800" }}>
            <ChatPanel messages={messages} onSend={sendMessage} myUserId={user?.id} />
          </Box>
        )}
      </Box>

      {/* Controls at the bottom, where every other video tool in the world puts
          them. Disabled rather than hidden when there is no local media: the
          buttons explain why the room is quiet, which their absence would not. */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 1, p: 1, bgcolor: "grey.900" }}>
        {/* Disabled on the DEVICE, not merely on the connection.
            A user who joined without a microphone — refused, missing, or busy;
            all supported paths, see mediaErrors.js — was shown a live-looking,
            enabled mic button that did nothing when pressed. The icon went on
            claiming they were transmitting. The button now says what is true,
            and the tooltip says why. */}
        <Tooltip title={!hasMic ? "אין מיקרופון זמין" : micOn ? "השתקה" : "ביטול השתקה"}>
          <span>
            <IconButton
              onClick={toggleMic}
              disabled={!connected || !hasMic}
              sx={controlSx(hasMic && micOn)}
              aria-label={!hasMic ? "אין מיקרופון זמין" : micOn ? "השתקה" : "ביטול השתקה"}
            >
              {hasMic && micOn ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={!hasCamera ? "אין מצלמה זמינה" : cameraOn ? "כיבוי מצלמה" : "הפעלת מצלמה"}>
          <span>
            <IconButton
              onClick={toggleCamera}
              disabled={!connected || !hasCamera}
              sx={controlSx(hasCamera && cameraOn)}
              aria-label={!hasCamera ? "אין מצלמה זמינה" : cameraOn ? "כיבוי מצלמה" : "הפעלת מצלמה"}
            >
              {hasCamera && cameraOn ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
          </span>
        </Tooltip>

        {/* The one control this platform needs more than the camera: reading a
            page together is what a chavruta does. */}
        <Tooltip title={sharing ? "הפסקת שיתוף" : "שיתוף מסך"}>
          <span>
            <IconButton onClick={shareScreen} disabled={!connected} sx={controlSx(!sharing)} aria-label={sharing ? "הפסקת שיתוף" : "שיתוף מסך"}>
              {sharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="צ׳אט">
          <IconButton onClick={openChat} sx={controlSx(!chatOpen)} aria-label="צ׳אט">
            <Badge badgeContent={unread} color="error">
              <ChatIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default VideoRoom;
