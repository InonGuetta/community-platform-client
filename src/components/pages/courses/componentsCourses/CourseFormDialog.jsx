import { useState } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import DialogTitle from "../../../features/Dialogs/DialogTitle";
import DialogContent from "../../../features/Dialogs/DialogContent";
import DialogActions from "../../../features/Dialogs/DialogActions";
import { useTranslation } from "react-i18next";

// `lecturers` is empty for a non-admin, and the field is hidden rather than shown
// empty: only an admin may set or change a course's lecturer, and a disabled
// control with no options reads as something broken.
const CourseFormDialog = ({ open, onClose, onSubmit, lecturers = [], canAssignLecturer, initial = {} }) => {
  const { t } = useTranslation(["courses", "common"]);
  const [form, setForm] = useState({
    title: initial.title || "",
    description: initial.description || "",
    lecturerId: initial.lecturer_id || "",
  });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = () => {
    const { lecturerId, ...rest } = form;
    // "" is the "no lecturer" option; the server wants null, not an empty string.
    onSubmit({ ...rest, ...(canAssignLecturer && { lecturerId: lecturerId === "" ? null : lecturerId }) });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle onClose={onClose}>{initial.id ? t("editCourse") : t("newCourse")}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label={t("form.name")} value={form.title} onChange={set("title")} fullWidth required autoFocus />
          <TextField label={t("form.description")} value={form.description} onChange={set("description")} fullWidth multiline rows={3} />
          {canAssignLecturer && (
            <TextField label={t("form.lecturer")} value={form.lecturerId} onChange={set("lecturerId")} select fullWidth>
              <MenuItem value="">{t("noLecturer")}</MenuItem>
              {lecturers.map((l) => (
                <MenuItem key={l.id} value={l.id}>{l.display_name || l.email}</MenuItem>
              ))}
            </TextField>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">{t("common:actions.cancel")}</Button>
        <Button onClick={submit} variant="contained" disabled={!form.title.trim()}>{t("form.save")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CourseFormDialog;
