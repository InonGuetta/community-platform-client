import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Button from "@mui/material/Button";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import MediaPlayer from "../../features/MediaPlayer/MediaPlayer";
import TextViewer from "./componentsMediaView/TextViewer";
import { mediaApi } from "../../../api/mediaApi";
import AISummaryPanel from "./componentsMediaView/AISummaryPanel";
import ChaptersPanel from "./componentsMediaView/ChaptersPanel";
import NotesPanel from "./componentsMediaView/NotesPanel";
import ShareDialog from "./componentsMediaView/ShareDialog";
import DownloadMenu from "./componentsMediaView/DownloadMenu";
import TranscriptEditor from "../../features/TranscriptEditor/TranscriptEditor";
import useMediaViewPageController from "./useMediaViewPageController";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../../../store/selectors/authSelectors";
import {
  generateKeyPointHeadings,
  triggerTranscriptPipeline,
} from "../../../store/slicesAndThunks/transcriptSlice/transcriptPut";
import { fetchTranscript } from "../../../store/slicesAndThunks/transcriptSlice/transcriptGet";
import { canManageMedia } from "../../../utilities/permissions";
import { fetchLikedIds } from "../../../store/slicesAndThunks/likesSlice/likesGet";
import { likeMedia } from "../../../store/slicesAndThunks/likesSlice/likesPost";
import { unlikeMedia } from "../../../store/slicesAndThunks/likesSlice/likesDelete";

// Pill-shaped outlined actions. The label carries the meaning and the icon only
// reinforces it, which is why these are Buttons rather than the bare IconButtons
// they replaced. `endIcon` rather than `startIcon`: the app runs RTL without the
// stylis flip plugin, so MUI's physical start/end margins do not swap and this
// is what puts the icon on the label's left, as in the rest of the UI.
const pillButtonSx = {
  borderRadius: 999,
  px: 1.75,
  textTransform: "none",
  color: "text.primary",
  borderColor: "divider",
  // The icon sits to the LEFT of the label here, so the gap between the two is
  // its margin-RIGHT; MUI's default puts the spacing on the left, which in this
  // unflipped RTL context pushes it against the text instead of away from it.
  "& .MuiButton-endIcon": { ml: -0.25, mr: 0.75, "& svg": { fontSize: 18 } },
  "&:hover": { borderColor: "text.disabled", bgcolor: "action.hover" },
};

const MediaViewPage = () => {
  const {
    media, transcript, bookmarks, resumePosition,
    handleSaveProgress, handleCreateBookmark,
    pollingStalled, retryPolling,
  } = useMediaViewPageController();
  const [tab, setTab] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [generatingHeadings, setGeneratingHeadings] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [downloadAnchor, setDownloadAnchor] = useState(null);
  const likedIds = useSelector((state) => state.likes.ids);
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const playerRef = useRef(null);
  const lastSavedAtRef = useRef(0);

  // Smart-search deep link: /media/:id?t=SECONDS → start the player at that point.
  // An explicit deep link wins over Resume Playback; otherwise fall back to the
  // saved watch position so the player picks up where the user left off.
  const [searchParams] = useSearchParams();
  const deepLinkSeek = Number(searchParams.get("t")) || 0;
  const seekOnReady = deepLinkSeek || resumePosition;

  // Cap the side panel to the media block's height so a long list (e.g. many
  // chapters) scrolls inside the panel instead of stretching it past the player.
  const mediaBoxRef = useRef(null);
  const [mediaHeight, setMediaHeight] = useState(null);

  useEffect(() => {
    const el = mediaBoxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setMediaHeight(e.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [media?.id, media?.media_type]);

  // Different media types offer different tabs, so an index kept across a
  // navigation could land on a tab that no longer exists there.
  useEffect(() => { setTab(0); }, [media?.id]);

  const handleGenerateHeadings = useCallback(async () => {
    if (!media?.id) return;
    setGeneratingHeadings(true);
    await dispatch(generateKeyPointHeadings(media.id));
    setGeneratingHeadings(false);
  }, [dispatch, media?.id]);

  // Books have no transcription step to piggyback on, so the summary needs its
  // own entry point. The refetch right after is what flips the polling loop on:
  // the trigger sets status='pending', and the page then watches until the
  // worker reaches 'done' or 'error'.
  const handleGenerateSummary = useCallback(async () => {
    if (!media?.id) return;
    setGeneratingSummary(true);
    const result = await dispatch(triggerTranscriptPipeline(media.id));
    if (result.meta.requestStatus === "fulfilled") {
      await dispatch(fetchTranscript(media.id));
    }
    setGeneratingSummary(false);
  }, [dispatch, media?.id]);

  // Which lectures this user has liked is not part of the media payload, so it
  // is fetched once per mount. The slice is shared with the likes page, which
  // loads the same ids as a side effect of loading its cards.
  useEffect(() => { dispatch(fetchLikedIds()); }, [dispatch]);

  const isLiked = media?.id ? likedIds.includes(media.id) : false;

  const handleToggleLike = useCallback(() => {
    if (!media?.id) return;
    dispatch(isLiked ? unlikeMedia(media.id) : likeMedia(media.id));
  }, [dispatch, isLiked, media?.id]);

  // Used by Chapters and Notes to jump the player to a specific timestamp
  // from a sibling component.
  const seekPlayer = useCallback((seconds) => {
    playerRef.current?.seekTo(seconds);
  }, []);

  // MediaPlayer now reports progress every ~1s. We update currentTime each
  // tick (cheap React state update) but throttle DB persistence to once
  // every 10s so the watch_progress endpoint isn't hammered.
  const handlePlayerProgress = useCallback((sec) => {
    setCurrentTime(sec);
    const now = Date.now();
    if (now - lastSavedAtRef.current >= 10000) {
      lastSavedAtRef.current = now;
      handleSaveProgress(sec);
    }
  }, [handleSaveProgress]);

  if (!media) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isText = media.media_type === "text";
  const keyPointHeadings = transcript?.ai_key_point_headings || [];
  // Available as soon as there's a transcript: if key points are missing (e.g.
  // the auto AI step failed on a long lecture), the server generates them from
  // the existing chunks on demand — so a transcript is all we need here.
  const canGenerateHeadings =
    (transcript?.chunks?.length ?? 0) > 0 ||
    (Array.isArray(transcript?.ai_key_points) && transcript.ai_key_points.length > 0);
  // Ownership, not just role. The server now refuses a transcript write from a
  // lecturer who did not upload the item, so testing the role alone here would
  // offer an editor and an AI button that 403 on press.
  const canEditTranscript = canManageMedia(user, media);

  // Built as a list rather than fixed indices: a document hides two of the four
  // tabs, and hard-coded `tab === 2` checks silently point at the wrong panel
  // the moment the set changes.
  //
  // "פרקים" and "תמלול" are both absent for a document. Chapters place a heading
  // on a *timeline* and seek the player to it — a book has neither — and there is
  // no transcript to edit. Personal notes stay, unchanged.
  const tabs = [
    { key: "summary", label: "סיכום" },
    ...(isText ? [] : [{ key: "chapters", label: "פרקים" }]),
    { key: "notes", label: "הערות אישיות" },
    ...(isText ? [] : [{ key: "transcript", label: "תמלול" }]),
  ];
  const activeTab = Math.min(tab, tabs.length - 1);
  const activeKey = tabs[activeTab]?.key;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>{media.title}</Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Box ref={mediaBoxRef}>
            {isText ? (
              <TextViewer mediaId={media.id} />
            ) : (
              <MediaPlayer
                ref={playerRef}
                url={mediaApi.streamUrl(media.id)}
                bookmarks={bookmarks}
                duration={media.duration_seconds}
                onProgress={handlePlayerProgress}
                seekOnReady={seekOnReady}
              />
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              // On desktop, match the media block's height so the panel never
              // grows past the player; content scrolls inside. On mobile (stacked)
              // let it size naturally.
              height: { xs: "auto", md: mediaHeight ? `${mediaHeight}px` : "100%" },
            }}
          >
            <Tabs value={activeTab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2, flexShrink: 0 }}>
              {tabs.map((t) => <Tab key={t.key} label={t.label} />)}
            </Tabs>

            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {activeKey === "summary" && (
                <AISummaryPanel
                  transcript={transcript}
                  isText={isText}
                  // Documents only: for audio/video this trigger would restart
                  // Whisper, and re-buying a three-hour transcription is not
                  // what "generate summary" should mean. Audio keeps its
                  // existing button in the transcript tab.
                  canGenerate={canEditTranscript && isText}
                  generating={generatingSummary}
                  onGenerate={handleGenerateSummary}
                  pollingStalled={pollingStalled}
                  onRetryPolling={retryPolling}
                />
              )}
              {activeKey === "chapters" && (
                <ChaptersPanel
                  keyPointHeadings={keyPointHeadings}
                  onSeek={seekPlayer}
                  canEdit={canEditTranscript}
                  canGenerate={canGenerateHeadings}
                  generating={generatingHeadings}
                  onGenerate={handleGenerateHeadings}
                />
              )}
              {activeKey === "notes" && (
                <NotesPanel
                  bookmarks={bookmarks}
                  currentTime={currentTime}
                  onCreateBookmark={handleCreateBookmark}
                  onSeek={seekPlayer}
                />
              )}
              {activeKey === "transcript" && (
                <TranscriptEditor
                  transcript={transcript}
                  mediaId={media.id}
                  canEdit={canEditTranscript}
                  pollingStalled={pollingStalled}
                  onRetryPolling={retryPolling}
                />
              )}
            </Box>

            {/* Pinned under the scrolling tab content (hence flexShrink: 0), so a
                long summary or chapter list never pushes these actions out of
                reach. */}
            <Divider sx={{ mt: 1, flexShrink: 0 }} />
            <Box sx={{ display: "flex", gap: 1, pt: 1, flexShrink: 0 }}>
              <Button
                onClick={handleToggleLike}
                variant="outlined"
                size="small"
                aria-pressed={isLiked}
                endIcon={isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                sx={{
                  ...pillButtonSx,
                  // Only the liked state takes the accent colour; unliked stays
                  // the same neutral pill as its two neighbours so the row does
                  // not read as one permanently-highlighted button.
                  ...(isLiked && {
                    color: "error.main",
                    borderColor: "error.main",
                    "&:hover": { borderColor: "error.main", bgcolor: "error.lighter" },
                  }),
                }}
              >
                {isLiked ? "אהבתי" : "לייק"}
              </Button>
              <Button
                onClick={(e) => setDownloadAnchor(e.currentTarget)}
                aria-haspopup="menu"
                variant="outlined"
                size="small"
                endIcon={<FileDownloadOutlinedIcon />}
                sx={pillButtonSx}
              >
                הורדה
              </Button>
              <Button
                onClick={() => setShareOpen(true)}
                variant="outlined"
                size="small"
                endIcon={<ShareOutlinedIcon />}
                sx={pillButtonSx}
              >
                שיתוף
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {media.description && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {media.description}
          </Typography>
        </Box>
      )}

      <DownloadMenu
        anchorEl={downloadAnchor}
        open={Boolean(downloadAnchor)}
        onClose={() => setDownloadAnchor(null)}
        media={media}
        transcript={transcript}
      />

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={media.title}
        currentTime={currentTime}
        canShareTime={!isText}
      />
    </Box>
  );
};

export default MediaViewPage;
