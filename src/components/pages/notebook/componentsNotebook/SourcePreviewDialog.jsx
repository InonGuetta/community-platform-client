import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import FloatingWindow from "../../../features/FloatingWindow/FloatingWindow";
import MediaPlayer from "../../../features/MediaPlayer/MediaPlayer";
import TextViewer from "../../mediaView/componentsMediaView/TextViewer";
import MediaInsightsTabs from "../../mediaView/componentsMediaView/MediaInsightsTabs";
import NotesPanel from "../../mediaView/componentsMediaView/NotesPanel";
import MediaActionsBar from "../../mediaView/componentsMediaView/MediaActionsBar";
import useMediaInsights from "../../mediaView/useMediaInsights";
import useMediaLike from "../../mediaView/useMediaLike";
import useMediaSave from "../../mediaView/useMediaSave";
import { createBookmark } from "../../../../store/slicesAndThunks/bookmarksSlice/bookmarksPost";
import { mediaApi } from "../../../../api/mediaApi";
import { mediaTypes } from "../../../../utilities/constant";
import { formatTime } from "../../../../utilities/formatTime";
import { truncateWords } from "../../../../utilities/truncateWords";

// Where the remembered position and size are kept. One key for every source, on
// purpose: having dragged the window somewhere and sized it, the user has said
// what they want a source to look like — so the next one opens exactly there
// rather than jumping back to the middle.
const GEOMETRY_KEY = "notebook:sourceWindow";

// The source of a note or a bookmark, floating over the notebook instead of
// replacing it. Navigating to /media/:id would unmount the notebook and take
// the half-written note with it, which is exactly the wrong trade for a screen
// whose whole purpose is writing *about* the lecture.
//
// It floats rather than blocks (see FloatingWindow): the notebook underneath
// stays fully live, so the source can be watched and the note written at the
// same time, which is the only reason to preview it here at all.
//
// Deliberately not MediaViewPage in a window: that page is route-bound, its
// controller reading useParams/useSearchParams. Everything below the player is
// the page's own components rather than a lookalike, driven by the same hooks —
// MediaInsightsTabs for the summary / chapters / transcript block, and
// MediaActionsBar for the like / download / share row under it. A preview that
// showed a stale transcript, or a second copy of that row styled by hand, would
// be worse than none: the copy is what drifts the next time the real one moves.
// How much of the note fits on the header's single line before it starts
// crowding out the lecture title next to it.
const NOTE_PREVIEW_WORDS = 7;

// The navigation arrows: big, turquoise, thickened, and lifted off the bar by a
// soft shadow.
//
// The colour is `secondary` — the app's teal — rather than `primary`, whose
// light-mode value is a dark navy that read as near-black. Taking it from the
// palette rather than hard-coding a hex is what makes it adapt in dark mode on
// its own: the theme already carries a lighter teal there, which is exactly the
// value that stays legible on a dark bar.
//
// Two filters stacked, doing different jobs. MUI's chevrons are a thin stroke
// and there is no bold variant of an icon font, so the weight comes from a pair
// of tight same-colour drop-shadows that fatten the stroke without blurring its
// edges. The third, offset and dark, is the depth — kept low-opacity so it
// reads as a lift rather than as an outline.
const arrowSx = {
  flexShrink: 0,
  color: "secondary.main",
  "& svg": {
    filter:
      "drop-shadow(0 0 0.7px currentColor) drop-shadow(0 0 0.7px currentColor) drop-shadow(0 2px 3px rgba(0,0,0,0.28))",
  },
  "&:hover": { bgcolor: "action.hover" },
  "&.Mui-disabled": { color: "text.disabled", "& svg": { filter: "none" } },
};

// Three ways out, from lightest to heaviest:
//   onClose        — the header's X: puts the window away, trail untouched.
//   onCloseCurrent — drops only the source on screen and moves to a neighbour.
//   onCloseAll     — ends the run: window away and the whole trail discarded.
// Each says exactly which of the three it is, because "סגירה" alone on three
// buttons would be three different outcomes wearing the same word.
const SourcePreviewDialog = ({
  open, onClose, onCloseCurrent, onCloseAll,
  mediaId, timestampSeconds, fallbackTitle, noteText,
  bookmarks = [],
  trailPosition, trailLength, onPrev, onNext,
}) => {
  const dispatch = useDispatch();
  const [media, setMedia] = useState(null);
  const [error, setError] = useState(false);
  const playerRef = useRef(null);

  // Where playback has reached, so a bookmark written here lands on the moment
  // the user is actually listening to rather than at zero.
  const [currentTime, setCurrentTime] = useState(0);

  // Fetched here rather than through the media slice on purpose: that slice's
  // selectedItem belongs to the media page, and writing this preview into it
  // would leave the wrong lecture behind for the next visit there.
  useEffect(() => {
    if (!open || !mediaId) return;
    let cancelled = false;
    setMedia(null);
    setError(false);
    mediaApi
      .getOne(mediaId)
      .then((data) => { if (!cancelled) setMedia(data); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [open, mediaId]);

  // Same hook the media page uses, so the transcript, its polling while the
  // workers run, and the two AI actions behave identically here.
  const insights = useMediaInsights(mediaId, media);

  // Likes are one list per user, not per screen: liking from this window lights
  // the button on the lecture's own page too, and on the likes page.
  const { isLiked, toggleLike } = useMediaLike(mediaId);
  const { isSaved, toggleSave } = useMediaSave(mediaId);

  // Lets a chapter or a bookmark jump the preview's player, as on the page.
  const seekPlayer = useCallback((seconds) => {
    playerRef.current?.seekTo(seconds);
  }, []);

  // Marking a spot has to work from here too, not only from the full lecture
  // page — this window is where the user is listening. The new bookmark goes
  // into the shared slice, which is the same list the notebook renders behind
  // this window, so it appears there immediately and under the right lecture.
  const handleCreateBookmark = useCallback((timestampSeconds, note) => {
    if (!media?.id) return;
    dispatch(createBookmark({ mediaId: Number(media.id), timestampSeconds, note }));
  }, [dispatch, media?.id]);

  const seekTo = timestampSeconds ?? 0;
  const title = media?.title || fallbackTitle || "שיעור";
  const notePreview = truncateWords(noteText, NOTE_PREVIEW_WORDS);
  const isText = media?.media_type === mediaTypes.text;

  return (
    <FloatingWindow
      open={open}
      onClose={onClose}
      storageKey={GEOMETRY_KEY}
      title={
        // Back / forward through the sources opened so far, with the current
        // one named between them. RTL: back points right, forward points left.
        // Both arrows are data-no-drag — the header is the drag handle, and a
        // click on a button in it must be a click, not the start of a drag.
        <>
          <Tooltip title="המקור הקודם">
            <span data-no-drag>
              <IconButton onClick={onPrev} disabled={!onPrev} aria-label="המקור הקודם" sx={arrowSx}>
                <KeyboardArrowRightIcon sx={{ fontSize: 42 }} />
              </IconButton>
            </span>
          </Tooltip>

          <Box sx={{ flex: 1, minWidth: 0, textAlign: "center", px: 0.5 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap component="div">
              {title}
              {timestampSeconds != null && (
                <Chip
                  size="small"
                  label={formatTime(timestampSeconds)}
                  sx={{ height: 18, fontSize: "0.65rem", mr: 0.75, verticalAlign: "middle" }}
                />
              )}
            </Typography>
            {/* The note this source was opened from — a few words only, so the
                header stays one line however long the note is. */}
            {notePreview && (
              <Typography variant="caption" color="text.secondary" noWrap component="div">
                {notePreview}
              </Typography>
            )}
          </Box>

          <Tooltip title="המקור הבא">
            <span data-no-drag>
              <IconButton onClick={onNext} disabled={!onNext} aria-label="המקור הבא" sx={arrowSx}>
                <KeyboardArrowLeftIcon sx={{ fontSize: 42 }} />
              </IconButton>
            </span>
          </Tooltip>

          {trailLength > 1 && (
            <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
              {`${trailPosition}/${trailLength}`}
            </Typography>
          )}
        </>
      }
      actions={
        <>
          {/* A way out to the full lecture, for everything this window does not
              carry — the description, the two-column layout, the deep link.
              Opens in a new browser tab, and deliberately does NOT close this
              window on the way: the notebook and the trail of sources stay
              exactly as they were in this tab, which is the whole reason the
              preview floats instead of navigating. */}
          <Button
            component={RouterLink}
            to={`/media/${mediaId}${seekTo > 0 ? `?t=${seekTo}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<OpenInFullIcon />}
            variant="outlined"
            size="small"
            sx={{ textTransform: "none" }}
          >
            פתיחה בעמוד השיעור
          </Button>
          {/* Just this one. Outlined rather than filled: it removes one item
              from a list the user can rebuild in a click, so it must not carry
              the same visual weight as the button that ends everything. */}
          <Button
            onClick={onCloseCurrent}
            variant="outlined"
            color="error"
            size="small"
            sx={{ textTransform: "none" }}
          >
            סגירת כרטיסייה נוכחית
          </Button>

          {/* The heaviest close: the window AND the whole trail of sources
              gathered behind the arrows. */}
          <Button
            onClick={onCloseAll}
            variant="contained"
            color="error"
            size="small"
            sx={{ fontWeight: 700 }}
          >
            סגירה מלאה של החלון והכרטיסיות
          </Button>
        </>
      }
    >
      {error ? (
        <Alert severity="error">לא ניתן לטעון את השיעור.</Alert>
      ) : !media ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {isText ? (
            <TextViewer mediaId={media.id} />
          ) : (
            <MediaPlayer
              ref={playerRef}
              url={mediaApi.streamUrl(media.id)}
              media={media}
              transcript={insights.transcript}
              seekOnReady={seekTo}
              onProgress={setCurrentTime}
            />
          )}

          {/* Stacked under the source rather than beside it: the window is
              narrower than the page's two columns, and a summary read
              underneath the player is the same reading order anyway. */}
          <Box sx={{ display: "flex", flexDirection: "column", mt: 2 }}>
            <MediaInsightsTabs
              mediaId={media.id}
              insights={insights}
              onSeek={seekPlayer}
              notesPanel={
                <NotesPanel
                  bookmarks={bookmarks}
                  currentTime={currentTime}
                  onCreateBookmark={handleCreateBookmark}
                  onSeek={seekPlayer}
                />
              }
            />

            {/* Literally the media page's row, imported rather than rebuilt, so
                any change to it shows up here unchanged. */}
            <MediaActionsBar
              media={media}
              transcript={insights.transcript}
              currentTime={currentTime}
              isText={isText}
              isLiked={isLiked}
              onToggleLike={toggleLike}
              isSaved={isSaved}
              onToggleSave={toggleSave}
            />
          </Box>
        </>
      )}
    </FloatingWindow>
  );
};

export default SourcePreviewDialog;
