import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { alpha } from "@mui/material/styles";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ShareDialog from "./ShareDialog";
import DownloadMenu from "../../../features/DownloadMenu/DownloadMenu";
import SaveMenu from "./SaveMenu";
// The same icons the personal shelves are labelled with — a button and the shelf
// it fills have to look like the same thing, and two independent imports stayed
// matched only for as long as nobody changed one of them.
import { likeIcons, saveIcons, LIKE_COLOUR, SAVE_COLOUR } from "../../personal/personalShelves";

// The like / save / download / share row, and the overlays behind it.
//
// One component rather than one per screen: the media page and the notebook's
// floating source preview show the SAME bar, so the styling below is the single
// place it is described. A change here lands on both, which is the point — two
// copies of a pill row drift the first time one of them is adjusted.
//
// Shared by the three plain pills and by the save control, which is a composite
// and therefore cannot inherit the Button styling — but must still take the same
// share of the row, or it would be the one item that sizes itself.
const pillSizeSx = { flex: 1, minWidth: 100, maxWidth: 170 };

// Pill-shaped outlined actions. The label carries the meaning and the icon only
// reinforces it, which is why these are Buttons rather than the bare IconButtons
// they replaced. `endIcon` rather than `startIcon`: the app runs RTL without the
// stylis flip plugin, so MUI's physical start/end margins do not swap and this
// is what puts the icon on the label's left, as in the rest of the UI.
const pillButtonSx = {
  borderRadius: 999,
  px: 2.5,
  py: 0.9,
  fontSize: "0.95rem",
  fontWeight: 600,
  textTransform: "none",
  color: "text.primary",
  borderColor: "divider",
  // Equal shares of the row, so the pills come out the same width whatever their
  // labels say — "לייק" is half the length of "שיתוף" and, left to size
  // themselves, the row read as four unrelated buttons rather than one control.
  // The bounds are what keep that from turning into four banners on a wide panel
  // or four slivers in the notebook's narrow window.
  ...pillSizeSx,
  // The icon sits to the LEFT of the label here, so the gap between the two is
  // its margin-RIGHT; MUI's default puts the spacing on the left, which in this
  // unflipped RTL context pushes it against the text instead of away from it.
  "& .MuiButton-endIcon": { ml: -0.25, mr: 0.75, "& svg": { fontSize: 22 } },
  "&:hover": { borderColor: "text.disabled", bgcolor: "action.hover" },
};

// Only the liked state takes a colour; unliked stays the same neutral pill as
// its two neighbours so the row does not read as one permanently-highlighted
// button. Green comes from the palette rather than a hex so it keeps its
// contrast in dark mode, where the theme already carries a lighter step — and
// the hover tint is derived from that same value instead of a made-up
// `success.lighter`, which is not a key MUI defines.
const likedSx = {
  color: LIKE_COLOUR,
  borderColor: LIKE_COLOUR,
  "&:hover": {
    borderColor: LIKE_COLOUR,
    bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
  },
};

// Saving is a split control: the wide half toggles the general save, the narrow
// half opens the lists. One outline drawn on the CONTAINER rather than on each
// half, so the two read as one pill and not as two buttons that happen to touch.
//
// The bookmark itself is purple in BOTH states — it is the mark that means
// "saved" on this site, and it is the same purple the saved shelf is drawn in
// throughout the nav, so the button and the shelf it fills are recognisably one
// thing. Purple rather than the like button's green: two adjacent pills in the
// same colour would read as saying the same thing, and these two say different
// things. Imported alongside the icons rather than named again here, for the
// same reason the icons are.
//
// What the SAVED state changes is the outline and the caret beside it, not the
// LABEL. That is the difference from the like pill above, and it is deliberate:
// this control has a second half sitting inside the same outline, and colouring
// the text as well made the whole thing read as pressed rather than as filed.
const savedColour = SAVE_COLOUR;

// The OUTLINE, though, stays the app's teal — deliberately not the bookmark's
// purple. The icon says what this control is and is drawn the same either way;
// the outline is the only thing that says whether this particular lecture is
// filed, and in teal that state reads as a state rather than as more of the icon.
// Two separate values on purpose: they are answering two different questions.
const savedBorderColour = "secondary.main";

const savePillSx = (isSaved) => ({
  ...pillSizeSx,
  display: "flex",
  alignItems: "stretch",
  overflow: "hidden",
  borderRadius: 999,
  border: "1px solid",
  borderColor: isSaved ? savedBorderColour : "divider",
  // Inherited by the caret half, which is the second thing that lights up.
  color: isSaved ? savedColour : "text.secondary",
  "&:hover": { borderColor: isSaved ? savedBorderColour : "text.disabled" },
});

// The wide half. Text-variant, so the container's outline is the only border.
//
// The LABEL is pinned to text.primary while the icon carries the purple — the
// icon has to be coloured explicitly because MUI's endIcon otherwise inherits
// the button's own text colour, which is exactly the one being held neutral.
const saveMainSx = () => ({
  flex: 1,
  minWidth: 0,
  px: 1.5,
  py: 0.9,
  borderRadius: 0,
  textTransform: "none",
  fontSize: "0.95rem",
  fontWeight: 600,
  color: "text.primary",
  "& .MuiButton-endIcon": {
    ml: -0.25,
    mr: 0.75,
    color: savedColour,
    "& svg": { fontSize: 22 },
  },
});

/**
 * `transcript` is optional — it only decides whether the download menu offers a
 * PDF; `isText` turns off sharing a timestamp, since a book has no playhead.
 * Likes and saves are passed in rather than read here so the owner of the screen
 * keeps one story about its data (see useMediaLike / useMediaSave, which both
 * callers use).
 */
const MediaActionsBar = ({
  media,
  transcript,
  currentTime = 0,
  isText = false,
  isLiked = false,
  onToggleLike,
  isSaved = false,
  onToggleSave,
}) => {
  const [shareOpen, setShareOpen] = useState(false);
  const [downloadAnchor, setDownloadAnchor] = useState(null);
  const [saveAnchor, setSaveAnchor] = useState(null);

  return (
    <>
      {/* flexShrink: 0 so that, pinned under a scrolling panel, a long summary
          or chapter list never pushes these actions out of reach. */}
      <Divider sx={{ mt: 1, flexShrink: 0 }} />
      {/* Centred as a group, with one `gap` doing the spacing so the gaps are
          equal by construction rather than by eye. Wrapping is the escape hatch
          for a narrow panel: four pills at their minimum width, on two centred
          rows, still beat four squashed ones on a single line. */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 1.5,
          pt: 1.5,
          flexShrink: 0,
        }}
      >
        <Button
          onClick={onToggleLike}
          variant="outlined"
          aria-pressed={isLiked}
          endIcon={isLiked ? <likeIcons.on /> : <likeIcons.off />}
          sx={{ ...pillButtonSx, ...(isLiked && likedSx) }}
        >
          {isLiked ? "אהבתי" : "לייק"}
        </Button>

        {/* Saving is two actions that belong together, so they share one pill
            rather than taking two slots in the row: the common case (keep this
            lecture) is a single click on the wide half, and filing it into a
            list of the user's own is the caret next to it. A menu on the whole
            pill would have put a choice in front of the common case every time;
            two separate pills would have said they were unrelated. */}
        <Box sx={savePillSx(isSaved)}>
          <Button
            onClick={onToggleSave}
            aria-pressed={isSaved}
            endIcon={isSaved ? <saveIcons.on /> : <saveIcons.off />}
            sx={saveMainSx()}
          >
            {isSaved ? "נשמר" : "שמירה"}
          </Button>
          {/* A hairline between the halves, so it is visible that the caret is
              its own target and a click there will not toggle the save. */}
          <Divider orientation="vertical" flexItem sx={{ borderColor: "inherit", opacity: 0.5 }} />
          <Tooltip title="הוספה לרשימת שיעורים">
            <IconButton
              onClick={(e) => setSaveAnchor(e.currentTarget)}
              aria-haspopup="menu"
              aria-label="הוספה לרשימת שיעורים"
              sx={{ borderRadius: 0, px: 0.5, color: "inherit" }}
            >
              <ExpandLessIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Button
          onClick={(e) => setDownloadAnchor(e.currentTarget)}
          aria-haspopup="menu"
          variant="outlined"
          endIcon={<FileDownloadOutlinedIcon />}
          sx={pillButtonSx}
        >
          הורדה
        </Button>
        <Button
          onClick={() => setShareOpen(true)}
          variant="outlined"
          endIcon={<ShareOutlinedIcon />}
          sx={pillButtonSx}
        >
          שיתוף
        </Button>
      </Box>

      <SaveMenu
        anchorEl={saveAnchor}
        open={Boolean(saveAnchor)}
        onClose={() => setSaveAnchor(null)}
        mediaId={media.id}
      />

      <DownloadMenu
        anchorEl={downloadAnchor}
        open={Boolean(downloadAnchor)}
        onClose={() => setDownloadAnchor(null)}
        media={media}
        transcript={transcript}
      />

      {/* The link is built from the lecture's own route rather than from where
          the user happens to be standing: this bar also renders inside the
          notebook, whose URL is /notebook and would have been shared as such. */}
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={media.title}
        path={`/media/${media.id}`}
        currentTime={currentTime}
        canShareTime={!isText}
      />
    </>
  );
};

export default MediaActionsBar;
