import MuiDialogContent from "@mui/material/DialogContent";

const DialogContent = ({ children, sx = {} }) => (
  <MuiDialogContent sx={{ pt: 2, ...sx }}>{children}</MuiDialogContent>
);

export default DialogContent;
