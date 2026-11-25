import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import DialogTitle from "../../../features/Dialogs/DialogTitle";
import DialogContent from "../../../features/Dialogs/DialogContent";
import DialogActions from "../../../features/Dialogs/DialogActions";
import { useTranslation, Trans } from "react-i18next";

// Typing a course's join code (PRD ROST-9). Layout only; the state is the
// page controller's (useMyCoursesPageController).
//
// After a code is accepted the dialog says what happens next — a REQUEST went
// to the lecturer — rather than closing, because "nothing changed in my list"
// would otherwise read as the code not having worked.
const JoinCourseDialog = ({ open, code, onCodeChange, submitting, error, joined, onSubmit, onClose }) => {
  const { t } = useTranslation(["courses", "common"]);
  return (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle onClose={onClose}>{t("join.title")}</DialogTitle>
    <DialogContent>
      {joined ? (
        <Alert severity="success">
          <Trans
            t={t}
            i18nKey={joined.lecturer_name ? "join.sentTo" : "join.sent"}
            values={{ course: joined.title, lecturer: joined.lecturer_name }}
            components={{ strong: <strong /> }}
          />
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
            {t("join.intro")}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            required
            label={t("join.code")}
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
        <Button variant="contained" onClick={onClose}>{t("join.close")}</Button>
      ) : (
        <>
          <Button variant="outlined" onClick={onClose}>{t("common:actions.cancel")}</Button>
          <Button variant="contained" type="submit" form="join-course-form" disabled={submitting || code.trim().length < 4}>
            {submitting ? t("join.sending") : t("join.send")}
          </Button>
        </>
      )}
    </DialogActions>
  </Dialog>
  );
};

export default JoinCourseDialog;
