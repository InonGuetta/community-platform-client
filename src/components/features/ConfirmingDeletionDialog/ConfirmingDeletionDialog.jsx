import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DialogTitle from "../Dialogs/DialogTitle";
import DialogContent from "../Dialogs/DialogContent";
import DialogActions from "../Dialogs/DialogActions";

// Display-only Hebrew label for the `type` prop; callers still pass the raw
// "media"/"user"/"item" values, so no calling code changes.
const TYPE_LABEL = { media: "את פריט המדיה", user: "את המשתמש", course: "את הקורס", item: "את הפריט" };

// `message` overrides the default sentence for callers that need their own
// wording; everything else about the dialog stays identical, so the confirm
// step looks the same wherever it appears.
//
// `title` and `confirmLabel` exist for a destructive action that is not a
// deletion — removing a student from a course deletes nobody, and a button
// reading "מחיקה" there would make a lecturer think it does.
const ConfirmingDeletionDialog = ({
  open, onClose, onConfirm, itemName, type = "item", message,
  title = "אישור מחיקה", confirmLabel = "מחיקה",
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle onClose={onClose}>{title}</DialogTitle>
    <DialogContent>
      <Typography>
        {message || (
          <>האם למחוק {TYPE_LABEL[type] || "את הפריט"} <strong>{itemName}</strong>? לא ניתן לבטל פעולה זו.</>
        )}
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="outlined">ביטול</Button>
      <Button onClick={onConfirm} variant="contained" color="error">{confirmLabel}</Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmingDeletionDialog;
