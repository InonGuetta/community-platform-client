import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import StopIcon from "@mui/icons-material/Stop";
import { myRecordingStatus } from "./sessionRecorder";

// Recording a session (PRD REC-1), as each person in the room sees it.
//
//   everyone     a red "מוקלט" chip whenever the room is being recorded, saying
//                whether THEIR voice is in it — never a recording nobody sees
//   the host     the start/stop button, and what is being saved
//   the others   the question, asked once when recording starts (or when they
//                arrive mid-recording), and a way to change the answer after
//
// Presentation only; useVideoRoom holds the state and the socket.

const STATUS_TEXT = {
  host: (count) => (count > 1 ? `מקליט — ${count} משתתפים בהקלטה` : "מקליט — רק הקול שלך בהקלטה"),
  recorded: () => "מוקלט — הקול שלך בהקלטה",
  declined: () => "מוקלט — הקול שלך לא בהקלטה",
  unanswered: () => "מוקלט — ממתין לתשובתך",
};

export const recordingLabel = (recording, mySocketId) => {
  const status = myRecordingStatus(recording, mySocketId);
  return status ? STATUS_TEXT[status](recording.consented.length) : null;
};

// The host's button, in the controls row.
export const RecordButton = ({ recorderStatus, pendingParts, onStart, onStop, disabled }) => {
  if (recorderStatus === "saving") {
    return (
      <Button size="small" variant="outlined" color="inherit" disabled sx={{ color: "grey.300" }}>
        {pendingParts > 0 ? `שומר הקלטה… (${pendingParts})` : "שומר הקלטה…"}
      </Button>
    );
  }
  if (recorderStatus === "recording") {
    return (
      <Button size="small" variant="contained" color="error" startIcon={<StopIcon />} onClick={onStop}>
        עצירת הקלטה
      </Button>
    );
  }
  return (
    <Button
      size="small"
      variant="outlined"
      color="error"
      startIcon={<FiberManualRecordIcon />}
      onClick={onStart}
      disabled={disabled || recorderStatus === "starting"}
    >
      {recorderStatus === "starting" ? "מתחיל…" : "הקלטה"}
    </Button>
  );
};

// The chip in the top bar, and — for a participant — the way to change their
// answer. Nothing at all when the room is not being recorded.
export const RecordingIndicator = ({ recording, mySocketId, onAnswer }) => {
  const status = myRecordingStatus(recording, mySocketId);
  if (!status) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }} data-testid="recording-indicator">
      <Chip
        size="small"
        color="error"
        icon={<FiberManualRecordIcon />}
        label={recordingLabel(recording, mySocketId)}
        sx={{ "& .MuiChip-icon": { animation: "rec-pulse 1.6s ease-in-out infinite" }, "@keyframes rec-pulse": { "50%": { opacity: 0.3 } } }}
      />
      {status === "recorded" && (
        <Button size="small" color="inherit" sx={{ color: "grey.300" }} onClick={() => onAnswer(false)}>
          הפסיקו להקליט אותי
        </Button>
      )}
      {status === "declined" && (
        <Button size="small" color="inherit" sx={{ color: "grey.300" }} onClick={() => onAnswer(true)}>
          אני מסכים/ה להקלטה
        </Button>
      )}
    </Box>
  );
};

// The question. Open while the participant has not answered; closing it any
// other way than "מסכים/ה" is a no — silence is never consent.
export const ConsentDialog = ({ recording, mySocketId, onAnswer }) => {
  const open = myRecordingStatus(recording, mySocketId) === "unanswered";
  return (
    <Dialog open={open} onClose={() => onAnswer(false)} aria-labelledby="recording-consent-title">
      <DialogTitle id="recording-consent-title">המארח מקליט את המפגש</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          ההקלטה תהפוך לשיעור בארכיון, עם תמלול וסיכום. היא כוללת קול בלבד, בלי וידאו.
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          הקול שלך ייכלל בהקלטה רק אם תסכים/י. אם לא — אפשר להמשיך להשתתף כרגיל, והקול שלך לא יוקלט.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          אפשר לשנות את התשובה בכל רגע במהלך המפגש.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onAnswer(false)}>לא, בלי הקול שלי</Button>
        {/* No autoFocus on either: Enter must not answer for them. */}
        <Button variant="contained" onClick={() => onAnswer(true)}>מסכים/ה להקלטה</Button>
      </DialogActions>
    </Dialog>
  );
};
