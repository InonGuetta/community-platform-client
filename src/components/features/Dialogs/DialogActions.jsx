import MuiDialogActions from "@mui/material/DialogActions";

const DialogActions = ({ children, sx = {} }) => (
  <MuiDialogActions sx={{ px: 3, pb: 2, gap: 1, ...sx }}>{children}</MuiDialogActions>
);

export default DialogActions;
