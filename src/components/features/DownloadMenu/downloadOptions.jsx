import { useNavigate } from "react-router-dom";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import AudiotrackOutlinedIcon from "@mui/icons-material/AudiotrackOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DownloadForOfflineOutlinedIcon from "@mui/icons-material/DownloadForOfflineOutlined";
import OfflinePinOutlinedIcon from "@mui/icons-material/OfflinePinOutlined";
import ClosedCaptionOutlinedIcon from "@mui/icons-material/ClosedCaptionOutlined";
import { mediaApi } from "../../../api/mediaApi";
import { mediaTypes } from "../../../utilities/constant";
import { offlineSupported, percentOf } from "../../../utilities/offlineStore";
import { DOWNLOADS_SHELF } from "../../layout/personalShelves";
import { toVtt } from "../../../utilities/transcriptTiming";
import { saveBlob } from "../../../utilities/saveBlob";
import { useDownloadActions } from "./useDownloadActions";
import { useTranslation } from "react-i18next";

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
  [mediaTypes.audio]: { labelKey: "download.audio", Icon: AudiotrackOutlinedIcon },
  [mediaTypes.video]: { labelKey: "download.video", Icon: VideocamOutlinedIcon },
  [mediaTypes.text]: { labelKey: "download.text", Icon: DescriptionOutlinedIcon },
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
  const { t } = useTranslation("media");
  const { busy, savedOffline, saving, captions, offerTranscript, handleTranscript, saveOffline } =
    useDownloadActions({ media, transcript, hasTranscript, onClose });
  const navigate = useNavigate();

  const { labelKey: fileLabelKey, Icon: FileIcon } = FILE_OPTION[media.media_type] || FILE_OPTION[mediaTypes.text];
  const fileLabel = t(fileLabelKey);
  const isVideo = media.media_type === mediaTypes.video;

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
        <ListItemText primary={t("download.audioOnly")} />
      </MenuItem>
    );
  }

  // Keeping the lesson on the device for listening with no network (PRD MOB-2).
  // A recording only — a document has nothing to listen to — and a video is
  // kept as its audio. Three states, one entry: offered, running (with how far),
  // and done, which leads to the downloads page where it is played.
  if (media.media_type !== mediaTypes.text && offlineSupported()) {
    if (savedOffline) {
      items.push(
        <MenuItem key="offline" onClick={() => { onClose?.(); navigate(DOWNLOADS_SHELF.path); }} sx={itemSx}>
          <ListItemIcon><OfflinePinOutlinedIcon fontSize="small" color="success" /></ListItemIcon>
          <ListItemText primary={t("download.availableOffline")} secondary={t("download.toOfflineShelf")} />
        </MenuItem>
      );
    } else if (saving) {
      const percent = percentOf(saving.received, saving.total);
      items.push(
        <MenuItem key="offline" disabled sx={itemSx}>
          <ListItemIcon><CircularProgress size={18} /></ListItemIcon>
          <ListItemText primary={percent === null ? t("download.savingOffline") : t("download.savingOfflinePercent", { percent })} />
        </MenuItem>
      );
    } else {
      items.push(
        <MenuItem key="offline" onClick={() => { onClose?.(); saveOffline(); }} sx={itemSx}>
          <ListItemIcon><DownloadForOfflineOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={t("download.saveOffline")} />
        </MenuItem>
      );
    }
  }

  // The captions as a WebVTT file (PRD MOB-5) — for a video player, an editor,
  // or a copy of the lesson put up elsewhere. Only where the transcript is
  // already loaded (the lesson page): the cues are built from it, and an archive
  // card has none.
  if (captions) {
    items.push(
      <MenuItem
        key="captions"
        onClick={() => {
          const name = (media.title || t("download.captionsFile")).replace(/[\\/:*?"<>|]+/g, " ").trim() || t("download.captionsFile");
          saveBlob(new Blob([toVtt(captions.cues, { precise: captions.precise })], { type: "text/vtt" }), `${name}.vtt`);
          onClose?.();
        }}
        sx={itemSx}
      >
        <ListItemIcon><ClosedCaptionOutlinedIcon fontSize="small" /></ListItemIcon>
        <ListItemText primary={t("download.captions")} />
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
        <ListItemText primary={busy ? t("download.preparingPdf") : t("download.transcriptPdf")} />
      </MenuItem>
    );
  }

  return items;
};
