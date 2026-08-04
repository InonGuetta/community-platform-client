import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import Dialog from "@mui/material/Dialog";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import ForwardToInboxOutlinedIcon from "@mui/icons-material/ForwardToInboxOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DialogTitle from "../../../features/Dialogs/DialogTitle";
import DialogContent from "../../../features/Dialogs/DialogContent";
import { notify } from "../../../../store/slicesAndThunks/notificationSlice";
import { formatTime } from "../../../../utilities/formatTime";

// Built from the live location rather than a hard-coded path so the link keeps
// working behind any deploy prefix, and drops an existing ?t= (the page may
// itself have been opened from a timestamped share) before appending our own.
const buildShareUrl = (seconds) => {
  const base = `${window.location.origin}${window.location.pathname}`;
  return seconds > 0 ? `${base}?t=${Math.floor(seconds)}` : base;
};

// MUI's ListItemButton carries a physical `text-align: left`, and this app runs
// RTL without the stylis flip plugin — so the label would sit at the far left of
// a full-width dialog row while its icon stays on the right. `start` resolves
// against the direction and keeps the two together.
const rowSx = { borderRadius: 1, textAlign: "start" };

// `canShareTime` is false for documents: a book has no playhead to point at.
const ShareDialog = ({ open, onClose, title, currentTime = 0, canShareTime = false }) => {
  const dispatch = useDispatch();
  const [withTime, setWithTime] = useState(false);

  // Reopening the dialog should start from the plain link again, so the choice
  // never carries over from a previous share.
  useEffect(() => { if (!open) setWithTime(false); }, [open]);

  const offerTime = canShareTime && currentTime >= 1;
  const url = buildShareUrl(offerTime && withTime ? currentTime : 0);
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
