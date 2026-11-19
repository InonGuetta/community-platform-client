import MuiDialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";

const DialogTitle = ({ children, onClose }) => {
  const { t } = useTranslation();
  return (
  <MuiDialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    {children}
    {onClose && (
      // Named: every dialog in the app closes through this one button, and a
      // bare ✕ is read as just "button" (PRD MOB-7 review).
      <IconButton onClick={onClose} size="small" aria-label={t("actions.close")}>
        <CloseIcon />
      </IconButton>
    )}
  </MuiDialogTitle>
  );
};

export default DialogTitle;
