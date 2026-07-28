import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import DialogTitle from "../Dialogs/DialogTitle";
import DialogContent from "../Dialogs/DialogContent";
import DialogActions from "../Dialogs/DialogActions";

// Display-only Hebrew label for the `type` prop; callers still pass the raw
// "media"/"user"/"item" values, so no calling code changes.
const TYPE_LABEL = { media: "את פריט המדיה", user: "את המשתמש", item: "את הפריט" };

const ConfirmingDeletionDialog = ({ open, onClose, onConfirm, itemName, type = "item" }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle onClose={onClose}>אישור מחיקה</DialogTitle>
    <DialogContent>
      <Typography>
        האם למחוק {TYPE_LABEL[type] || "את הפריט"} <strong>{itemName}</strong>? לא ניתן לבטל פעולה זו.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="outlined">ביטול</Button>
      <Button onClick={onConfirm} variant="contained" color="error">מחיקה</Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmingDeletionDialog;
