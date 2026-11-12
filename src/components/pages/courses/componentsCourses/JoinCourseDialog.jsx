import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import DialogTitle from "../../../features/Dialogs/DialogTitle";
import DialogContent from "../../../features/Dialogs/DialogContent";
import DialogActions from "../../../features/Dialogs/DialogActions";

// Typing a course's join code (PRD ROST-9). Layout only; the state is the
// page controller's (useMyCoursesPageController).
//
// After a code is accepted the dialog says what happens next — a REQUEST went
// to the lecturer — rather than closing, because "nothing changed in my list"
// would otherwise read as the code not having worked.
const JoinCourseDialog = ({ open, code, onCodeChange, submitting, error, joined, onSubmit, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle onClose={onClose}>הצטרפות לקורס</DialogTitle>
    <DialogContent>
      {joined ? (
        <Alert severity="success">
          הבקשה להצטרף לקורס <strong>{joined.title}</strong> נשלחה
          {joined.lecturer_name ? <> ל{joined.lecturer_name}</> : null}. הקורס יופיע כאן אחרי שהבקשה תאושר.
        </Alert>
      ) : (
        <form
          id="join-course-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            הזינו את הקוד שקיבלתם מהמרצה. הבקשה תישלח אליו לאישור.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="קוד הצטרפות"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
            inputProps={{ dir: "ltr", maxLength: 16, autoCapitalize: "characters", autoComplete: "off", style: { letterSpacing: "0.2em", fontFamily: "monospace", textAlign: "center" } }}
            error={Boolean(error)}
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </form>
      )}
    </DialogContent>
    <DialogActions>
      {joined ? (
        <Button variant="contained" onClick={onClose}>סגירה</Button>
      ) : (
        <>
          <Button variant="outlined" onClick={onClose}>ביטול</Button>
          <Button variant="contained" type="submit" form="join-course-form" disabled={submitting || code.trim().length < 4}>
            {submitting ? "שולח…" : "שליחת בקשה"}
          </Button>
        </>
      )}
    </DialogActions>
  </Dialog>
);

export default JoinCourseDialog;
