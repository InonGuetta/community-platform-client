import Dialog from "@mui/material/Dialog";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useTranslation, Trans } from "react-i18next";
import DialogTitle from "../Dialogs/DialogTitle";
import DialogContent from "../Dialogs/DialogContent";
import DialogActions from "../Dialogs/DialogActions";

// What is being deleted is worded per `type` (common: confirmDelete.what.*);
// callers still pass the raw "media"/"user"/"course"/"item", and an unknown
// type reads as "the item".
const KNOWN_TYPES = ["media", "user", "course", "item"];

// `message` overrides the default sentence for callers that need their own
// wording; everything else about the dialog stays identical, so the confirm
// step looks the same wherever it appears.
//
// `title` and `confirmLabel` exist for a destructive action that is not a
// deletion — removing a student from a course deletes nobody, and a button
// reading "delete" there would make a lecturer think it does. Absent, they are
// the shared words.
const ConfirmingDeletionDialog = ({
  open, onClose, onConfirm, itemName, type = "item", message, title, confirmLabel,
}) => {
  const { t } = useTranslation();
  const what = t(`confirmDelete.what.${KNOWN_TYPES.includes(type) ? type : "item"}`);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle onClose={onClose}>{title ?? t("confirmDelete.title")}</DialogTitle>
      <DialogContent>
        <Typography>
          {message || (
            <Trans t={t} i18nKey="confirmDelete.question" values={{ what, name: itemName }} components={{ strong: <strong /> }} />
          )}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">{t("actions.cancel")}</Button>
        <Button onClick={onConfirm} variant="contained" color="error">{confirmLabel ?? t("actions.delete")}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmingDeletionDialog;
