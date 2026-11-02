import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import IosShareIcon from "@mui/icons-material/IosShare";

// Installing on an iPhone or iPad (PRD MOB-1). iOS gives a page no way to open
// an install dialog — only Safari's own Share menu can add it to the home
// screen — so the most the app can do is say where that is.
const InstallHelpDialog = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ textAlign: "right" }}>התקנה באייפון או באייפד</DialogTitle>
    <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography>
        1. בספארי, לחצו על כפתור השיתוף <IosShareIcon fontSize="small" sx={{ verticalAlign: "middle" }} /> בתחתית המסך.
      </Typography>
      <Typography>2. בחרו ״הוספה למסך הבית״.</Typography>
      <Typography>3. לחצו ״הוספה״. האפליקציה תופיע במסך הבית ותיפתח בלי שורת הכתובת.</Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} variant="contained">הבנתי</Button>
    </DialogActions>
  </Dialog>
);

export default InstallHelpDialog;
