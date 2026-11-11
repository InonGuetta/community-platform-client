import { useShareDialog } from "./useShareDialog";
import Dialog from "@mui/material/Dialog";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Switch from "@mui/material/Switch";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import PublicIcon from "@mui/icons-material/Public";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import ForwardToInboxOutlinedIcon from "@mui/icons-material/ForwardToInboxOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DialogTitle from "../../../features/Dialogs/DialogTitle";
import DialogContent from "../../../features/Dialogs/DialogContent";
import { formatTime } from "../../../../utilities/formatTime";

// MUI's ListItemButton carries a physical `text-align: left`, and this app runs
// RTL without the stylis flip plugin — so the label would sit at the far left of
// a full-width dialog row while its icon stays on the right. `start` resolves
// against the direction and keeps the two together.
const rowSx = { borderRadius: 1, textAlign: "start" };

// `canShareTime` is false for documents: a book has no playhead to point at.
//
// `publicLink` (PRD COM-3b, see usePublicLink) — when the lesson is public,
// every way of sharing below sends the PUBLIC link: it opens with no account,
// and it is the one WhatsApp shows a preview of. Its manager also gets the
// switch. Without it (or for a lesson that is not public) the link is the
// lesson's own page, which asks a stranger to sign in.
const ShareDialog = ({ open, onClose, title, path, currentTime = 0, canShareTime = false, publicLink = null }) => {
  const {
    withTime, setWithTime, sharingPublic, offerTime,
    handleWhatsApp, handleGmail, handleMailApp, handleCopy,
  } = useShareDialog({ open, onClose, title, path, currentTime, canShareTime, publicLink });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle onClose={onClose}>שיתוף</DialogTitle>
      <DialogContent>
        <List disablePadding>
          <ListItemButton onClick={handleWhatsApp} sx={rowSx}>
            <ListItemIcon sx={{ minWidth: 40 }}><WhatsAppIcon sx={{ color: "#25D366" }} /></ListItemIcon>
            <ListItemText primary="WhatsApp" />
          </ListItemButton>
          <ListItemButton onClick={handleGmail} sx={rowSx}>
            <ListItemIcon sx={{ minWidth: 40 }}><EmailOutlinedIcon /></ListItemIcon>
            <ListItemText primary="Gmail" />
          </ListItemButton>
          <ListItemButton onClick={handleMailApp} sx={rowSx}>
            <ListItemIcon sx={{ minWidth: 40 }}><ForwardToInboxOutlinedIcon /></ListItemIcon>
            <ListItemText primary="אפליקציית מייל" />
          </ListItemButton>
          <ListItemButton onClick={handleCopy} sx={rowSx}>
            <ListItemIcon sx={{ minWidth: 40 }}><ContentCopyIcon /></ListItemIcon>
            <ListItemText primary="העתקת קישור" />
          </ListItemButton>
        </List>

        {publicLink?.canManage && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={publicLink.isPublic}
                  onChange={publicLink.toggle}
                  disabled={publicLink.busy}
                />
              }
              label={
                <span>
                  <PublicIcon fontSize="small" sx={{ verticalAlign: "middle", ml: 0.5 }} />
                  קישור ציבורי: פתוח גם בלי חשבון
                </span>
              }
            />
            <Typography variant="caption" color="text.secondary" component="p">
              מי שמקבל את הקישור רואה את השיעור ואת הסיכום שלו, בלי המחברת ובלי הצ׳אט. שאר הארכיון נשאר סגור.
            </Typography>
            {publicLink.isPublic && !publicLink.isPublished && (
              <Alert severity="warning" sx={{ mt: 1 }}>השיעור הוא טיוטה, ולכן הקישור הציבורי לא ייפתח עד שיפורסם.</Alert>
            )}
          </>
        )}
        {sharingPublic && !publicLink?.canManage && (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
            השיעור הזה פתוח גם בלי חשבון, אז אפשר לשתף אותו עם כל אחד.
          </Typography>
        )}

        {offerTime && (
          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Checkbox size="small" checked={withTime} onChange={(e) => setWithTime(e.target.checked)} />}
            label={`שתף מהזמן הנוכחי (${formatTime(currentTime)})`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
