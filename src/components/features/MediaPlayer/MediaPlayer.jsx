import { useRef, useState, useEffect, useCallback } from "react";
import ReactPlayer from "react-player";
import Box from "@mui/material/Box";
import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";
import BookmarkTimeline from "./BookmarkTimeline";

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

const MediaPlayer = ({ url, bookmarks = [], duration, onProgress, segments = [] }) => {
  const playerRef = useRef(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [subtitle, setSubtitle] = useState("");
  const progressTimerRef = useRef(null);

  const handleProgress = useCallback(({ playedSeconds }) => {
    if (segments.length) {
      const seg = segments.find((s) => playedSeconds >= s.start && playedSeconds <= s.end);
      setSubtitle(seg?.text || "");
    }

    if (!progressTimerRef.current) {
      progressTimerRef.current = setTimeout(() => {
        onProgress?.(Math.floor(playedSeconds));
        progressTimerRef.current = null;
      }, 10000);
    }
  }, [segments, onProgress]);

  useEffect(() => () => clearTimeout(progressTimerRef.current), []);

  const seekTo = (seconds) => playerRef.current?.seekTo(seconds, "seconds");

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

      {subtitle && (
        <Box sx={{
          position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)",
          bgcolor: "rgba(0,0,0,0.75)", color: "white", px: 2, py: 0.5, borderRadius: 1,
          maxWidth: "80%", textAlign: "center", fontSize: 14,
        }}>
          {subtitle}
        </Box>
      )}

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
};

export default MediaPlayer;
