import { useState } from "react";
import { useDispatch } from "react-redux";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import AudiotrackOutlinedIcon from "@mui/icons-material/AudiotrackOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { mediaApi } from "../../../../api/mediaApi";
import { transcriptsApi } from "../../../../api/transcriptsApi";
import { transcriptToText } from "../../../../utilities/transcriptText";
import { notify } from "../../../../store/slicesAndThunks/notificationSlice";

// What the media file itself is called, per media_type. The menu names the thing
// being downloaded rather than saying a generic "file", so a user who sees two
// entries can tell which one is the lecture and which one is its text.
const FILE_OPTION = {
  audio: { label: "הורדת אודיו", Icon: AudiotrackOutlinedIcon },
  video: { label: "הורדת וידאו", Icon: VideocamOutlinedIcon },
  text: { label: "הורדת המסמך", Icon: DescriptionOutlinedIcon },
};

// Filenames reach the OS, where these characters are either illegal or path
// separators. Hebrew titles are left alone — only the reserved set is stripped.
const safeFilename = (title) => (title || "תמלול").replace(/[\\/:*?"<>|]/g, "").trim() || "תמלול";

// MenuItem inherits a physical `text-align: left` from MUI, and this app runs
// RTL without the stylis flip plugin, so the label drifts away from its icon.
const itemSx = { textAlign: "start" };

// The media page anchors this to a button at the BOTTOM of a panel, so the menu
// has to grow upwards or it opens off-screen. An archive card anchors it to an
// icon at the top, where the opposite is true.
const ORIGINS = {
  up: {
    anchorOrigin: { vertical: "top", horizontal: "right" },
    transformOrigin: { vertical: "bottom", horizontal: "right" },
  },
  down: {
    anchorOrigin: { vertical: "bottom", horizontal: "right" },
    transformOrigin: { vertical: "top", horizontal: "right" },
  },
};

/**
 * `transcript` is for callers that already hold one (the media page). Callers
 * that only know a transcript EXISTS pass `hasTranscript` instead — the archive
 * list carries that flag but not the text, and fetching every card's transcript
 * to render a menu nobody opened would be pure waste. The text is then pulled in
 * on the click that needs it.
 */
const DownloadMenu = ({ anchorEl, open, onClose, media, transcript, hasTranscript, direction = "up" }) => {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const { label: fileLabel, Icon: FileIcon } = FILE_OPTION[media.media_type] || FILE_OPTION.text;

  const loadedText = transcriptToText(transcript);
  const offerTranscript = Boolean(loadedText) || Boolean(hasTranscript);

  // Building the PDF pulls in jsPDF, the bidi tables and the Hebrew font, and may
  // need the transcript itself first, so it is async and can fail. A failure is
  // reported rather than swallowed: from the user's side a silent no-op is
  // indistinguishable from a click that missed.
  const handleTranscript = async () => {
    setBusy(true);
    try {
      const text = loadedText || transcriptToText(await transcriptsApi.get(media.id));
      if (!text) {
        dispatch(notify({ message: "אין תמלול זמין לפריט זה.", severity: "warning" }));
        return;
      }
      const { downloadTranscriptPdf } = await import("../../../../utilities/transcriptPdf");
      await downloadTranscriptPdf(media.title, text, `${safeFilename(media.title)}.pdf`);
    } catch {
      dispatch(notify({ message: "יצירת ה-PDF נכשלה. נסה שוב.", severity: "error" }));
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      {...ORIGINS[direction]}
      slotProps={{ paper: { sx: { minWidth: 200 } } }}
    >
      <MenuItem
        component="a"
        href={mediaApi.downloadUrl(media.id)}
        download
        onClick={onClose}
        sx={itemSx}
      >
        <ListItemIcon><FileIcon fontSize="small" /></ListItemIcon>
        <ListItemText primary={fileLabel} />
      </MenuItem>

      {/* A video also carries audio, and for a lecture that is often the only
          part anyone wants — it plays in the car and is a fraction of the size.
          The server extracts it on request; nothing is stored twice. */}
      {media.media_type === "video" && (
        <MenuItem
          component="a"
          href={mediaApi.downloadAudioUrl(media.id)}
          download
          onClick={onClose}
          sx={itemSx}
        >
          <ListItemIcon><AudiotrackOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="הורדת אודיו בלבד" />
        </MenuItem>
      )}

      {/* Offered only when there is a transcript with actual content. A
          transcript row can exist while still pending or failed, and an empty
          PDF is worse than no option at all. */}
      {offerTranscript && (
        <MenuItem onClick={handleTranscript} disabled={busy} sx={itemSx}>
          <ListItemIcon>
            {busy ? <CircularProgress size={18} /> : <PictureAsPdfOutlinedIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText primary={busy ? "מכין PDF..." : "הורדת תמלול (PDF)"} />
        </MenuItem>
      )}
    </Menu>
  );
};

export default DownloadMenu;
