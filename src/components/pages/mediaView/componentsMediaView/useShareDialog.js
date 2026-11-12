import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { notify } from "../../../../store/slicesAndThunks/snackbarSlice";

// What the share dialog does — the link it shares, and each way of sending
// it — so that ShareDialog.jsx is layout only. See ShareDialog.jsx for which
// link is shared when.

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

/**
 * @param {{ open: boolean, onClose: () => void, title: string, path?: string,
 *   currentTime?: number, canShareTime?: boolean, publicLink?: any }} props
 */
export const useShareDialog = ({ open, onClose, title, path, currentTime = 0, canShareTime = false, publicLink = null }) => {
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

  return {
    withTime, setWithTime, sharingPublic, offerTime,
    handleWhatsApp, handleGmail, handleMailApp, handleCopy,
  };
};
