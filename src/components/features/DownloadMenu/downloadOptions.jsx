import { useState } from "react";
import { useDispatch } from "react-redux";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import AudiotrackOutlinedIcon from "@mui/icons-material/AudiotrackOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { mediaApi } from "../../../api/mediaApi";
import { transcriptsApi } from "../../../api/transcriptsApi";
import { transcriptToText } from "../../../utilities/transcriptText";
import { mediaTypes } from "../../../utilities/constant";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";

// WHAT CAN BE DOWNLOADED FROM A LECTURE — stated once, for every menu that
// offers it.
//
// There are two such menus and they are not near each other in the tree: the
// download pill under the media panel (DownloadMenu, also used by an archive
// card) and the player's own settings menu, which has to carry these entries
// because the browser's native menu cannot be added to. They were written
// separately and drifted exactly as you would expect — the settings menu never
// grew the transcript PDF, so the same lecture offered two different sets of
// downloads depending on which control you opened.
//
// So the entries live here as a hook that BUILDS THE MENU ITEMS, and each menu
// spreads them into its own <Menu>. Items rather than plain descriptors because
// the PDF entry is not a link: it has to fetch, render and report failure, and
// leaving that to every caller is the same duplication one level down. They come
// back as an ARRAY so they stay direct children of MUI's MenuList — a wrapper
// component around them would break its keyboard handling.

// What the media file itself is called, per media_type. The menu names the thing
// being downloaded rather than saying a generic "file", so a user who sees two
// entries can tell which one is the lecture and which one is its text.
const FILE_OPTION = {
  [mediaTypes.audio]: { label: "הורדת אודיו", Icon: AudiotrackOutlinedIcon },
  [mediaTypes.video]: { label: "הורדת וידאו", Icon: VideocamOutlinedIcon },
  [mediaTypes.text]: { label: "הורדת המסמך", Icon: DescriptionOutlinedIcon },
};

// MenuItem inherits a physical `text-align: left` from MUI, and this app runs
// RTL without the stylis flip plugin, so the label drifts away from its icon.
const itemSx = { textAlign: "start" };

/**
 * The download entries for one lecture, as MenuItem elements.
 *
 * `transcript` is for callers that already hold one (the media page and the
 * player on it). Callers that only know a transcript EXISTS pass `hasTranscript`
 * instead — the archive list carries that flag but not the text, and fetching
 * every card's transcript to render a menu nobody opened would be pure waste.
 * The text is then pulled in on the click that needs it.
 *
 * `onClose` is the owning menu's close: every entry here ends the menu, whether
 * it navigated to a file or finished building a PDF.
 */
export const useDownloadItems = ({ media, transcript, hasTranscript, onClose }) => {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);

  const { label: fileLabel, Icon: FileIcon } = FILE_OPTION[media.media_type] || FILE_OPTION[mediaTypes.text];
  const isVideo = media.media_type === mediaTypes.video;

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
      // Both come from the same dynamic import: the filename rule belongs with
      // the writer that uses it, and pulling it in statically would drag the
      // PDF module into the bundle everyone loads.
      const { downloadHebrewPdf, safeFileBaseName } = await import("../../../utilities/hebrewPdf");
      // One section, no heading: the transcript IS the document, and a heading
      // repeating the title directly under it would only be the title twice.
      await downloadHebrewPdf({
        title: media.title,
        sections: [{ text }],
        filename: `${safeFileBaseName(media.title, "תמלול")}.pdf`,
      });
    } catch {
      dispatch(notify({ message: "יצירת ה-PDF נכשלה. נסה שוב.", severity: "error" }));
    } finally {
      setBusy(false);
      onClose?.();
    }
  };

  const items = [
    <MenuItem
      key="file"
      component="a"
      href={mediaApi.downloadUrl(media.id)}
      download
      onClick={onClose}
      sx={itemSx}
    >
      <ListItemIcon><FileIcon fontSize="small" /></ListItemIcon>
      <ListItemText primary={fileLabel} />
    </MenuItem>,
  ];

  // A video also carries audio, and for a lecture that is often the only part
  // anyone wants — it plays in the car and is a fraction of the size. The server
  // extracts it on request; nothing is stored twice.
  if (isVideo) {
    items.push(
      <MenuItem
        key="audio"
        component="a"
        href={mediaApi.downloadAudioUrl(media.id)}
        download
        onClick={onClose}
        sx={itemSx}
      >
        <ListItemIcon><AudiotrackOutlinedIcon fontSize="small" /></ListItemIcon>
        <ListItemText primary="הורדת אודיו בלבד" />
      </MenuItem>
    );
  }

  // Offered only when there is a transcript with actual content. A transcript
  // row can exist while still pending or failed, and an empty PDF is worse than
  // no option at all.
  if (offerTranscript) {
    items.push(
      <MenuItem key="transcript" onClick={handleTranscript} disabled={busy} sx={itemSx}>
        <ListItemIcon>
          {busy ? <CircularProgress size={18} /> : <PictureAsPdfOutlinedIcon fontSize="small" />}
        </ListItemIcon>
        <ListItemText primary={busy ? "מכין PDF..." : "הורדת תמלול (PDF)"} />
      </MenuItem>
    );
  }

  return items;
};
