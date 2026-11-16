import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import IosShareIcon from "@mui/icons-material/IosShare";
import { useTranslation, Trans } from "react-i18next";

// Installing on an iPhone or iPad (PRD MOB-1). iOS gives a page no way to open
// an install dialog — only Safari's own Share menu can add it to the home
// screen — so the most the app can do is say where that is.
const InstallHelpDialog = ({ open, onClose }) => {
  const { t } = useTranslation(["nav", "common"]);
  return (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ textAlign: "start" }}>{t("installHelp.title")}</DialogTitle>
    <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography>
        <Trans t={t} i18nKey="installHelp.step1" components={{ icon: <IosShareIcon fontSize="small" sx={{ verticalAlign: "middle" }} /> }} />
      </Typography>
      <Typography>{t("installHelp.step2")}</Typography>
      <Typography>{t("installHelp.step3")}</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="contained">{t("common:actions.gotIt")}</Button>
    </DialogActions>
  </Dialog>
  );
};

export default InstallHelpDialog;
