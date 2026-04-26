import MuiDialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

const DialogTitle = ({ children, onClose }) => (
  <MuiDialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    {children}
    {onClose && (
      <IconButton onClick={onClose} size="small">
        <CloseIcon />
      </IconButton>
    )}
  </MuiDialogTitle>
);

export default DialogTitle;
