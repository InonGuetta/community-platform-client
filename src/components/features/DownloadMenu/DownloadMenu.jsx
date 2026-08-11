import Menu from "@mui/material/Menu";
import { useDownloadItems } from "./downloadOptions";

// The menu behind a "הורדה" control. WHAT it offers is not decided here — see
// downloadOptions.jsx, which the player's settings menu reads from too, so the
// two cannot offer different things for the same lecture.
//
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

const DownloadMenu = ({ anchorEl, open, onClose, media, transcript, hasTranscript, direction = "up" }) => {
  const items = useDownloadItems({ media, transcript, hasTranscript, onClose });

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      {...ORIGINS[direction]}
      slotProps={{ paper: { sx: { minWidth: 200 } } }}
    >
      {items}
    </Menu>
  );
};

export default DownloadMenu;
