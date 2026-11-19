import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ShareDialog from "./ShareDialog";
import DownloadMenu from "../../../features/DownloadMenu/DownloadMenu";
import SaveMenu from "./SaveMenu";
import usePublicLink from "../usePublicLink";
// The same icons the personal shelves are labelled with — a button and the shelf
// it fills have to look like the same thing, and two independent imports stayed
// matched only for as long as nobody changed one of them.
import { likeIcons, saveIcons, SAVE_COLOUR } from "../../../layout/personalShelves";
import { RADIUS } from "../../../../theme/tokens";
import { useTranslation } from "react-i18next";

// The like / save / download / share row, and the overlays behind it.
//
// One component rather than one per screen: the media page and the notebook's
// floating source preview show the SAME bar, so the styling below is the single
// place it is described. A change here lands on both, which is the point — two
// copies of a pill row drift the first time one of them is adjusted.
//
// Redesign v4 (screen 20): a row of `soft` pills under a hairline, the icon
// leading the label, starting from the reader's side and wrapping when the card
// is narrow. "אהבתי" turns `tinted-success` once pressed (D-25).

// Saving is a split control: the wide half toggles the general save, the narrow
// half opens the lists. One soft pill drawn on the CONTAINER rather than on each
// half, so the two read as one control and not as two buttons that happen to
// touch. The bookmark is the saved shelf's purple (palette.personal, D-25) — the
// mark that means "saved" on this site — and is drawn filled once saved.
const savePillSx = {
  display: "inline-flex",
  alignItems: "stretch",
  overflow: "hidden",
  borderRadius: `${RADIUS.pill}px`,
  bgcolor: "surface.fill",
  color: "text.primary",
};

// Both halves light up on their own under the pointer, so it is visible that
// the caret is a target of its own and a click there will not toggle the save.
const saveHalfSx = {
  borderRadius: 0,
  color: "inherit",
  "&:hover": { bgcolor: "surface.fillHover" },
};

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
  const { t } = useTranslation("lesson");
  const [shareOpen, setShareOpen] = useState(false);
  // A lesson its manager made public is shared by its public link (PRD COM-3b).
  const publicLink = usePublicLink(media);
  const [downloadAnchor, setDownloadAnchor] = useState(null);
  const [saveAnchor, setSaveAnchor] = useState(null);

  return (
    <>
      {/* flexShrink: 0 so that, pinned under a scrolling panel, a long summary
          or chapter list never pushes these actions out of reach. */}
      <Divider sx={{ mt: 3, flexShrink: 0 }} />
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          pt: 2.5,
          flexShrink: 0,
        }}
      >
        <Button
          onClick={onToggleLike}
          variant={isLiked ? "tinted-success" : "soft"}
          aria-pressed={isLiked}
          startIcon={isLiked ? <likeIcons.on /> : <likeIcons.off />}
          sx={{ px: 2.5 }}
        >
          {isLiked ? t("actions.liked") : t("actions.like")}
        </Button>

        {/* Saving is two actions that belong together, so they share one pill
            rather than taking two slots in the row: the common case (keep this
            lecture) is a single click on the wide half, and filing it into a
            list of the user's own is the caret next to it. A menu on the whole
            pill would have put a choice in front of the common case every time;
            two separate pills would have said they were unrelated. */}
        <Box sx={savePillSx}>
          <Button
            onClick={onToggleSave}
            aria-pressed={isSaved}
            startIcon={isSaved ? <saveIcons.on /> : <saveIcons.off />}
            sx={{
              ...saveHalfSx,
              paddingInlineStart: 2.5,
              paddingInlineEnd: 1.5,
              "& .MuiButton-startIcon": { color: SAVE_COLOUR },
            }}
          >
            {isSaved ? t("actions.saved") : t("actions.save")}
          </Button>
          <Divider orientation="vertical" flexItem sx={{ my: 1.25 }} />
          <Tooltip title={t("actions.addToList")}>
            <IconButton
              onClick={(e) => setSaveAnchor(e.currentTarget)}
              aria-haspopup="menu"
              aria-label={t("actions.addToList")}
              sx={{ ...saveHalfSx, paddingInlineStart: 0.75, paddingInlineEnd: 1.25 }}
            >
              <ExpandLessIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Button
          onClick={(e) => setDownloadAnchor(e.currentTarget)}
          aria-haspopup="menu"
          variant="soft"
          startIcon={<FileDownloadOutlinedIcon />}
        >
          {t("actions.download")}
        </Button>
        <Button
          onClick={() => setShareOpen(true)}
          variant="soft"
          startIcon={<ShareOutlinedIcon />}
        >
          {t("actions.share")}
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
        publicLink={publicLink}
      />
    </>
  );
};

export default MediaActionsBar;
