import MuiDialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

const DialogTitle = ({ children, onClose }) => (
  <MuiDialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    {children}
    {onClose && (
      // Named: every dialog in the app closes through this one button, and a
      // bare ✕ is read as just "button" (PRD MOB-7 review).
      <IconButton onClick={onClose} size="small" aria-label="סגירת החלון">
        <CloseIcon />
      </IconButton>
    )}
  </MuiDialogTitle>
);

export default DialogTitle;
