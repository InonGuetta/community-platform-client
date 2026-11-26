import { forwardRef, useImperativeHandle, useRef, useState, useCallback, useEffect } from "react";
import usePlayback from "./usePlayback";
import ReactPlayer from "react-player";
import Box from "@mui/material/Box";
import PlayerControls from "./PlayerControls";
import { mediaTypes } from "../../../utilities/constant";
import { RADIUS, SHADOW, CARD_SHELL_SX, WHITE } from "../../../theme/tokens";
import { captionAt } from "../../../utilities/transcriptTiming";
import { useFullscreen } from "../../../utilities/useFullscreen";

// A video's stage: the picture's own shape. Audio has no stage any more — it
// is a card under the lesson's cover (D-21).
const STAGE_ASPECT = "16 / 9";

// How long the control bar stays up over a playing video after the last pointer
// movement. Long enough to reach it without chasing, short enough that it is out
// of the picture for the rest of the lecture.
const CONTROLS_HIDE_AFTER_MS = 2500;

// Whether captions are on is a reader's habit, not a lesson's property, so it is
// remembered across lessons — in a try, because localStorage can throw.
const CAPTIONS_KEY = "captionsOn";
const readCaptionsOn = () => {
  try { return localStorage.getItem(CAPTIONS_KEY) === "1"; } catch { return false; }
};
const saveCaptionsOn = (on) => {
  try { localStorage.setItem(CAPTIONS_KEY, on ? "1" : "0"); } catch { /* not remembered */ }
};

// forwardRef so callers can drive the player from a sibling — the chapters list
// seeks it, and so does the notebook's source preview.
//
// `media` is the row itself rather than the id and type picked off it: the
// settings menu offers the same downloads as the page's download pill (see
// downloadOptions.jsx), and those need the title and the media type as well.
// `transcript` is optional and only decides whether a PDF is offered.
// `captions` is { cues, precise } from utilities/transcriptTiming (PRD MOB-5),
// or null when the lesson has nothing to caption.
const MediaPlayer = forwardRef((
  { url, media, transcript, captions = null, onProgress, onEnded, seekOnReady = 0, playOnReady = false, initialRate = null },
  ref
) => {
  const mediaType = media?.media_type;
  const isVideo = mediaType === mediaTypes.video;

  // Playing, position, volume, speed, resuming and the lock screen — shared
  // with the bottom player (usePlayback; D-145), so the two cannot drift.
  // `playOnReady` and `initialRate` arrive when this page takes over a lesson
  // the bottom player was playing.
  const {
    playerRef, playing, togglePlay, position: played, shownPosition, duration: effectiveDuration,
    volume, muted, handleVolumeChange, handleToggleMute, playbackRate, setPlaybackRate,
    seekTo, scrub, commitScrub, playerEvents,
  } = usePlayback({ url, media, seekOnReady, playOnReady, initialRate, onProgress, onEnded });

  useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

  // ── The bar getting out of the way ─────────────────────────────────────────
  //
  // Over a picture the control bar is an overlay, and an overlay that never
  // leaves is part of the picture: it sat across the bottom of every frame for
  // the whole lecture. It now fades out while playback runs and comes back the
  // moment the pointer moves.
  //
  // Only over a picture. For audio the bar is the entire player, and hiding it
  // would leave an empty rectangle.
  const [pointerAwake, setPointerAwake] = useState(true);
  const [controlsBusy, setControlsBusy] = useState(false);
  const hideTimerRef = useRef(null);

  const wakeControls = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    setPointerAwake(true);
    hideTimerRef.current = setTimeout(() => setPointerAwake(false), CONTROLS_HIDE_AFTER_MS);
  }, []);

  // Pausing brings the bar back and keeps it: a paused player is one the user is
  // looking at rather than watching, and the controls are the point of it.
  useEffect(() => {
    if (playing) return wakeControls();
    clearTimeout(hideTimerRef.current);
    setPointerAwake(true);
  }, [playing, wakeControls]);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  const controlsVisible = !isVideo || !playing || controlsBusy || pointerAwake;

  // ── Full screen (a video only) ──────────────────────────────────────────────
  //
  // The whole stage goes full screen — picture, captions and our own bar — not
  // the <video> alone, which would bring back the browser's controls and drop
  // ours (the settings menu with speed and downloads). A double click on the
  // picture does the same, as in every player people already use.
  const stageRef = useRef(null);
  const fullscreen = useFullscreen(stageRef);

  // ── Captions (PRD MOB-5) ────────────────────────────────────────────────────
  //
  // Drawn by the page rather than as a <track> on the media element: an audio
  // lesson plays in an <audio>, which shows no captions at all, and this way the
  // same line appears over a picture and inside a recording's player card, in
  // the same right-to-left type as the rest of the page.
  const [captionsOn, setCaptionsOn] = useState(readCaptionsOn);
  const toggleCaptions = useCallback(() => {
    setCaptionsOn((on) => { saveCaptionsOn(!on); return !on; });
  }, []);
  const hasCaptions = Boolean(captions?.cues?.length);
  const caption = hasCaptions && captionsOn ? captionAt(captions.cues, played) : null;

  // The media element stays rendered and playing in BOTH layouts — a <video>
  // for a picture, an <audio> for a lecture without one (see forceAudio below;
  // it was a <video> for both until background play needed otherwise).
  const player = (
    <ReactPlayer
      ref={playerRef}
      url={url}
      width="100%"
      height="100%"
      controls={false}
      playing={playing}
      volume={volume}
      muted={muted}
      playbackRate={playbackRate}
      // Progress, duration, ready, play/pause and the end — the last moves the
      // page on to the course's next lesson (PRD CRS-3).
      {...playerEvents}
      // An audio lesson as an <audio> element (PRD MOB-3). The stream URL
      // has no extension, so ReactPlayer would otherwise build a <video>
      // for it too — and a phone pauses a VIDEO when the screen locks or
      // the browser goes to the background, which made a shiur stop the
      // moment the phone went into a pocket. Audio is allowed to play on.
      config={{ file: { forceAudio: !isVideo } }}
    />
  );

  const controls = (
    <PlayerControls
      playing={playing}
      onTogglePlay={togglePlay}
      volume={volume}
      muted={muted}
      onVolumeChange={handleVolumeChange}
      onToggleMute={handleToggleMute}
      played={shownPosition}
      duration={effectiveDuration}
      onSeek={scrub}
      onSeekCommit={commitScrub}
      playbackRate={playbackRate}
      onRateChange={setPlaybackRate}
      media={media}
      transcript={transcript}
      variant={isVideo ? "overlay" : "card"}
      // Keeps the bar up while its own menus are open — see PlayerControls.
      onBusyChange={setControlsBusy}
      captionsAvailable={hasCaptions}
      captionsOn={captionsOn}
      onToggleCaptions={toggleCaptions}
      fullscreenAvailable={isVideo && fullscreen.supported}
      fullscreenOn={fullscreen.active}
      onToggleFullscreen={fullscreen.toggle}
    />
  );

  // ── Audio: a card, not a stage (D-21) ──────────────────────────────────────
  //
  // The lecture used to stand its bar in the middle of an empty 16:9 frame —
  // the frame the side panel was measured against. The redesign gives an audio
  // lesson its cover art instead, and the player becomes the card under it:
  // play, the line and its times, and a row of the secondary buttons. The tabs
  // card no longer takes its height from here (D-22), so nothing is reserved.
  if (!isVideo) {
    return (
      <Box
        data-testid="player-card"
        sx={{
          position: "relative",
          ...CARD_SHELL_SX,
          p: 2.5,
        }}
      >
        {/* Kept to an invisible 1×1 — still laid out, still playing, but with
            no surface to paint. Not `display: none`, which would take its box
            away entirely and is a heavier promise to make about a playing
            element. "1px", not 1: in MUI's sx a bare number for width/height
            between 0 and 1 is read as a PERCENTAGE. */}
        <Box
          data-testid="player-element"
          sx={{
            position: "absolute",
            width: "1px",
            height: "1px",
            overflow: "hidden",
            opacity: 0,
            pointerEvents: "none",
          }}
        >
          {player}
        </Box>

        {/* Captions (PRD MOB-5): an <audio> shows none of its own, so the line
            being said is drawn here, inside the card, above the controls. */}
        {caption && (
          <Box
            data-testid="player-caption"
            // The lesson's own words: their direction, not the interface's.
            dir="auto"
            sx={{
              mb: 2,
              px: 2,
              py: 1.25,
              borderRadius: `${RADIUS.field}px`,
              bgcolor: "surface.fill2",
              color: "text.primary",
              textAlign: "center",
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            {caption}
          </Box>
        )}

        {controls}
      </Box>
    );
  }

  // ── Video: the picture, with the bar floating over its foot ────────────────
  return (
    <Box
      ref={stageRef}
      data-testid="player-stage"
      sx={{
        position: "relative",
        width: "100%",
        bgcolor: "black",
        // Redesign v4: the video player's own radius and heavy shadow (part B).
        borderRadius: `${RADIUS.hero}px`,
        boxShadow: SHADOW.player,
        overflow: "hidden",
        // Full screen: the stage is the screen, square-cornered, and the
        // picture fills it at its own shape (objectFit: contain, below).
        "&:fullscreen": { borderRadius: 0, display: "flex", alignItems: "stretch" },
        "&:fullscreen > .player-frame": { aspectRatio: "auto", height: "100%" },
      }}
    >
      <Box
        className="player-frame"
        onPointerMove={wakeControls}
        // Leaving the picture is as clear a "done with the controls" as running
        // out of time, and waiting the full delay afterwards only leaves the bar
        // sitting on a frame nobody is pointing at.
        onPointerLeave={() => setPointerAwake(false)}
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: STAGE_ASPECT,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          p: 2,
        }}
      >
        {/* The picture itself is the play/pause target, the way it is in every
            player people already use. It works because this element and the bar
            are SIBLINGS rather than nested: a click on the bar lands on the bar
            and stops there, so pressing a button in it cannot also toggle
            playback behind it. */}
        <Box
          onClick={togglePlay}
          onDoubleClick={fullscreen.supported ? fullscreen.toggle : undefined}
          sx={{
            position: "absolute",
            inset: 0,
            cursor: "pointer",
            "& video": { width: "100%", height: "100%", objectFit: "contain", display: "block" },
          }}
        >
          {player}
        </Box>

        {caption && (
          <Box
            data-testid="player-caption"
            // The lesson's own words: their direction, not the interface's.
            dir="auto"
            sx={{
              position: "absolute",
              insetInline: 0,
              zIndex: 1,
              display: "flex",
              justifyContent: "center",
              px: 2,
              pointerEvents: "none",
              // Just above the bar — lower when the bar has faded away.
              bottom: controlsVisible ? 76 : 20,
              transition: "bottom 220ms ease",
            }}
          >
            <Box
              component="span"
              sx={{
                maxWidth: 680,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                bgcolor: "rgba(0,0,0,0.72)",
                color: WHITE,
                textAlign: "center",
                lineHeight: 1.5,
                fontSize: { xs: "0.95rem", sm: "1.15rem" },
              }}
            >
              {caption}
            </Box>
          </Box>
        )}

        {/* visibility, not just opacity: a bar faded to nothing would still
            swallow the click meant for the picture underneath it. The transition
            lists visibility too, or it would snap away before the fade. */}
        <Box
          data-testid="player-bar"
          sx={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            opacity: controlsVisible ? 1 : 0,
            visibility: controlsVisible ? "visible" : "hidden",
            transition: "opacity 220ms ease, visibility 220ms ease",
          }}
        >
          {controls}
        </Box>
      </Box>
    </Box>
  );
});

MediaPlayer.displayName = "MediaPlayer";

export default MediaPlayer;
