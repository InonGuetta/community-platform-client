import Menu from "@mui/material/Menu";
import { useDownloadItems } from "./downloadOptions";
import { useDirection, menuOrigins } from "../../../i18n/useDirection";

// The menu behind a "הורדה" control. WHAT it offers is not decided here — see
// downloadOptions.jsx, which the player's settings menu reads from too, so the
// two cannot offer different things for the same lecture.
//
// The media page anchors this to a button at the BOTTOM of a panel, so the menu
// has to grow upwards or it opens off-screen. An archive card anchors it to an
// icon at the top, where the opposite is true.

const DownloadMenu = ({ anchorEl, open, onClose, media, transcript, hasTranscript, direction = "up" }) => {
  const items = useDownloadItems({ media, transcript, hasTranscript, onClose });
  const { start } = useDirection();

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      {...menuOrigins(start, direction)}
      slotProps={{ paper: { sx: { minWidth: 200 } } }}
    >
      {items}
    </Menu>
  );
};

export default DownloadMenu;
