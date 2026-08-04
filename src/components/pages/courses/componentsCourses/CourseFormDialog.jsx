import { useState } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import DialogTitle from "../../../features/Dialogs/DialogTitle";
import DialogContent from "../../../features/Dialogs/DialogContent";
import DialogActions from "../../../features/Dialogs/DialogActions";

// `lecturers` is empty for a non-admin, and the field is hidden rather than shown
// empty: only an admin may set or change a course's lecturer, and a disabled
// control with no options reads as something broken.
const CourseFormDialog = ({ open, onClose, onSubmit, lecturers = [], canAssignLecturer, initial = {} }) => {
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
      <DialogTitle onClose={onClose}>{initial.id ? "עריכת קורס" : "קורס חדש"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="שם הקורס" value={form.title} onChange={set("title")} fullWidth required autoFocus />
          <TextField label="תיאור" value={form.description} onChange={set("description")} fullWidth multiline rows={3} />
          {canAssignLecturer && (
            <TextField label="מרצה אחראי" value={form.lecturerId} onChange={set("lecturerId")} select fullWidth>
              <MenuItem value="">ללא מרצה</MenuItem>
              {lecturers.map((l) => (
                <MenuItem key={l.id} value={l.id}>{l.display_name || l.email}</MenuItem>
              ))}
            </TextField>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">ביטול</Button>
        <Button onClick={submit} variant="contained" disabled={!form.title.trim()}>שמירה</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CourseFormDialog;
