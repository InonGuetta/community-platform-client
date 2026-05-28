import { forwardRef, useImperativeHandle, useRef, useState, useCallback } from "react";
import ReactPlayer from "react-player";
import Box from "@mui/material/Box";
import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";
import BookmarkTimeline from "./BookmarkTimeline";

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

// forwardRef so MediaViewPage can call player.seekTo(sec) from the Chapters
// tab. Without this the chapters list has no way to drive the player.
const MediaPlayer = forwardRef(({ url, bookmarks = [], duration, onProgress }, ref) => {
  const playerRef = useRef(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Fire on every ReactPlayer tick (~1s) so consumers see fresh playback time.
  // Throttling for any DB persistence is now the caller's responsibility —
  // here we only want the UI to feel real-time.
  const handleProgress = useCallback(({ playedSeconds }) => {
    onProgress?.(Math.floor(playedSeconds));
  }, [onProgress]);

  const seekTo = useCallback((seconds) => {
    playerRef.current?.seekTo(seconds, "seconds");
  }, []);

  useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

  return (
    <Box sx={{ position: "relative", width: "100%", bgcolor: "black", borderRadius: 2, overflow: "hidden" }}>
      <ReactPlayer
        ref={playerRef}
        url={url}
        width="100%"
        height="auto"
        controls
        playbackRate={playbackRate}
        onProgress={handleProgress}
        style={{ aspectRatio: "16/9" }}
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, bgcolor: "grey.900" }}>
        <ButtonGroup size="small" variant="outlined">
          {SPEED_OPTIONS.map((speed) => (
            <Button
              key={speed}
              onClick={() => setPlaybackRate(speed)}
              sx={{ color: playbackRate === speed ? "primary.main" : "grey.400", borderColor: "grey.700", minWidth: 44 }}
            >
              {speed}x
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      <BookmarkTimeline bookmarks={bookmarks} duration={duration} onSeek={seekTo} />
    </Box>
  );
});

MediaPlayer.displayName = "MediaPlayer";

export default MediaPlayer;
