import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

// Asked when a card is saved without a title.
//
// A question, not a refusal: an untitled note is allowed, it is just rarely
// meant — it shows in every list as "(ללא כותרת)" and is the one note nobody can
// find again. So the dialog offers the name right where the question is asked,
// and the one button says which of the two is about to happen: "שמור בכל זאת"
// while the field is empty, "שמור" the moment a name is typed into it.
//
// `onSave` receives the trimmed name, or "" for "save it untitled anyway".
const UntitledNoteDialog = ({ open, onCancel, onSave }) => {
  const [name, setName] = useState("");

  // Every opening starts empty: a name typed into the last dialog and then
  // cancelled is not a name for the next note.
  useEffect(() => {
    if (open) setName("");
  }, [open]);

  const trimmed = name.trim();
  const save = () => onSave(trimmed);

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>לא צוין שם לכרטיסייה</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          אפשר לתת לה שם עכשיו, או לשמור אותה בלי שם.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="שם הכרטיסייה"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>ביטול</Button>
        <Button variant="contained" onClick={save}>
          {trimmed ? "שמור" : "שמור בכל זאת"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UntitledNoteDialog;
