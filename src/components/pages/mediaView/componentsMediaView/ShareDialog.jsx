import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
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
import { notify } from "../../../../store/slicesAndThunks/notificationSlice";
import { formatTime } from "../../../../utilities/formatTime";

// The origin comes from the live location so the link keeps working wherever the
// app is served, and an existing ?t= is dropped (the page may itself have been
// opened from a timestamped share) before appending our own.
//
// `path` is for callers that are not standing on the page they are sharing — the
// notebook floats a lecture over /notebook, and without this the shared link
// would point at the notebook instead. It defaults to the current path.
const buildShareUrl = (seconds, path) => {
  const base = `${window.location.origin}${path || window.location.pathname}`;
  return seconds > 0 ? `${base}?t=${Math.floor(seconds)}` : base;
};

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
  const dispatch = useDispatch();
  const [withTime, setWithTime] = useState(false);

  // Reopening the dialog should start from the plain link again, so the choice
  // never carries over from a previous share.
  useEffect(() => { if (!open) setWithTime(false); }, [open]);

  const sharingPublic = Boolean(publicLink?.isPublic && publicLink?.isPublished);
  // The guest page has no "from this moment": a stranger starts at the start.
  const offerTime = canShareTime && currentTime >= 1 && !sharingPublic;
  const url = sharingPublic ? publicLink.url : buildShareUrl(offerTime && withTime ? currentTime : 0, path);
  const text = `${title}\n${url}`;

  // Opened without an opener reference: a share target has no reason to keep a
  // handle on the app's window.
  const openExternal = (href) => {
    window.open(href, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleWhatsApp = () => openExternal(`https://wa.me/?text=${encodeURIComponent(text)}`);

  // Gmail's web compose, for the common case of a browser user with no desktop
  // mail client registered. `mailto:` silently does nothing for them — the
  // browser hands the URL to the OS, the OS has no handler, and the click looks
  // like it missed. This path needs nothing installed.
  const handleGmail = () =>
    openExternal(
      "https://mail.google.com/mail/?view=cm&fs=1" +
      `&su=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
    );

  // The OS handler, for Outlook/Thunderbird users. Driven by a real anchor
  // click rather than assigning window.location: inside a single-page app the
  // assignment races the router, and the navigation can be cancelled before the
  // hand-off happens.
  const handleMailApp = () => {
    const a = document.createElement("a");
    a.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    onClose();
  };

  // navigator.clipboard is unavailable on insecure origins, so the failure path
  // shows the link itself instead of silently doing nothing.
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      dispatch(notify({ message: "הקישור הועתק", severity: "success" }));
      onClose();
    } catch {
      dispatch(notify({ message: `לא ניתן להעתיק אוטומטית. הקישור: ${url}`, severity: "warning" }));
    }
  };

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
