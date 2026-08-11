import { useState, useRef, useCallback, useEffect } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import MediaPlayer from "../../features/MediaPlayer/MediaPlayer";
import { stageHeightForWidth } from "../../features/MediaPlayer/stageGeometry";
import TextViewer from "./componentsMediaView/TextViewer";
import { mediaApi } from "../../../api/mediaApi";
import MediaInsightsTabs from "./componentsMediaView/MediaInsightsTabs";
import NotesPanel from "./componentsMediaView/NotesPanel";
import MediaActionsBar from "./componentsMediaView/MediaActionsBar";
import useMediaViewPageController from "./useMediaViewPageController";

// Presentation only. Everything that dispatches, selects or derives from server
// data lives in useMediaViewPageController — see its header for where that line
// is drawn and why this file used to sit on the wrong side of it.
//
// What remains here is state no other file could want: which tab is open and
// the measured height of the media block. The actions row under the panel —
// like, download, share, and the overlays they open — is MediaActionsBar, shared
// with the notebook's source preview so the two cannot drift apart.
const MediaViewPage = () => {
  const controller = useMediaViewPageController();
  const {
    media, bookmarks, transcript,
    seekOnReady, currentTime, handlePlayerProgress,
    handleCreateBookmark,
    isLiked, toggleLike,
    isSaved, toggleSave,
    isText,
  } = controller;

  // Stays here rather than in the controller: a ref has to be created in the
  // component that renders the element it points at.
  const playerRef = useRef(null);

  // Cap the side panel to the media block's height so a long list (e.g. many
  // chapters) scrolls inside the panel instead of stretching it past the player.
  //
  // The WIDTH is measured too, and it is what saves the layout for audio. An
  // audio lecture's block is now a ~50px control bar rather than a 16:9 stage,
  // and a panel matching that height had no room left for its own content: the
  // tab row and the actions row do not shrink, so the scrolling middle was
  // squeezed to zero and the summary, chapters, notes and transcript were all
  // rendered at no height at all.
  const mediaBoxRef = useRef(null);
  const [mediaBox, setMediaBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = mediaBoxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setMediaBox({ width: e.contentRect.width, height: e.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [media?.id, media?.media_type]);

  // Match the block, but never fall below the height a STAGE would have at this
  // width. The player reserves that frame for audio as well as video, so today
  // the measurement already carries it and this floor changes nothing — it is a
  // guard, not the mechanism.
  //
  // Kept because the failure it prevents is silent and disproportionate: the tab
  // row and the actions row do not shrink, so the moment the block is shorter
  // than the two of them the scrolling content between is squeezed to nothing
  // and the summary, chapters, notes and transcript all render at zero height on
  // a page that otherwise looks perfectly normal. One Math.max against the
  // player's own geometry costs nothing and rules out the whole class.
  const panelHeight = Math.max(mediaBox.height, stageHeightForWidth(mediaBox.width));

  // Used by Chapters and Notes to jump the player to a specific timestamp
  // from a sibling component.
  const seekPlayer = useCallback((seconds) => {
    playerRef.current?.seekTo(seconds);
  }, []);

  if (!media) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

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
                media={media}
                // Only so the player's settings menu can offer the transcript
                // PDF without fetching one it already has.
                transcript={transcript}
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
              // On desktop, the height worked out above; content scrolls inside.
              // On mobile (stacked) let it size naturally.
              height: { xs: "auto", md: panelHeight ? `${panelHeight}px` : "100%" },
            }}
          >
            <MediaInsightsTabs
              mediaId={media.id}
              insights={controller}
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

            {/* The same bar the notebook's source preview renders — it owns the
                divider that pins it under the scrolling tab content, and the
                share dialog and download menu behind it. */}
            <MediaActionsBar
              media={media}
              transcript={transcript}
              currentTime={currentTime}
              isText={isText}
              isLiked={isLiked}
              onToggleLike={toggleLike}
              isSaved={isSaved}
              onToggleSave={toggleSave}
            />
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

    </Box>
  );
};

export default MediaViewPage;
