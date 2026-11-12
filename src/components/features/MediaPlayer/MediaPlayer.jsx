import { forwardRef, useImperativeHandle, useRef, useState, useCallback, useEffect } from "react";
import useMediaSession from "./useMediaSession";
import ReactPlayer from "react-player";
import Box from "@mui/material/Box";
import PlayerControls from "./PlayerControls";
import { mediaTypes } from "../../../utilities/constant";
import { STAGE_ASPECT } from "./stageGeometry";
import { captionAt } from "../../../utilities/transcriptTiming";

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
  { url, media, transcript, captions = null, onProgress, onEnded, seekOnReady = 0 },
  ref
) => {
  const mediaType = media?.media_type;
  const duration = media?.duration_seconds;
  const playerRef = useRef(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);

  // Volume and mute are kept apart on purpose. Muting does not touch `volume`,
  // so unmuting restores exactly the level that was set before — which is what
  // "click again and the sound comes back as it was" means. A user who instead
  // drags the slider to zero has genuinely chosen silence, so the speaker
  // button lifts them back to the last audible level rather than to 0.
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const lastAudibleVolumeRef = useRef(1);

  const handleVolumeChange = useCallback((next) => {
    setVolume(next);
    if (next > 0) {
      lastAudibleVolumeRef.current = next;
      // Dragging the slider up is itself a request to hear something.
      setMuted(false);
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    if (muted || volume === 0) {
      setMuted(false);
      if (volume === 0) setVolume(lastAudibleVolumeRef.current || 1);
      return;
    }
    lastAudibleVolumeRef.current = volume;
    setMuted(true);
  }, [muted, volume]);

  // The file's real length, once the player knows it. The `duration` prop comes
  // from the database and can be missing or slightly off; this is the value the
  // scrub bar has to agree with or the thumb lands in the wrong place.
  const [loadedDuration, setLoadedDuration] = useState(0);
  const effectiveDuration = loadedDuration || duration || 0;

  // While the user is dragging the scrub bar, the thumb follows the pointer and
  // NOT the playing position — otherwise every progress tick yanks it back and
  // the bar becomes impossible to drag.
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  // Auto-seek (deep link ?t= or Resume Playback) must happen exactly once, and
  // only after the media is ready — seekTo before load is a no-op. seekOnReady
  // can also arrive late (the resume position is fetched async), so we react to
  // both "became ready" and "value arrived" via an effect. The ref guards
  // against re-seeking on later renders, which would fight a user who manually
  // rewinds. It resets per source so a new media item resumes again.
  const hasAutoSeekedRef = useRef(false);
  useEffect(() => {
    hasAutoSeekedRef.current = false;
    setIsReady(false);
    setPlaying(false);
    setPlayed(0);
    setLoadedDuration(0);
  }, [url]);

  useEffect(() => {
    if (isReady && seekOnReady > 0 && !hasAutoSeekedRef.current) {
      hasAutoSeekedRef.current = true;
      playerRef.current?.seekTo(seekOnReady, "seconds");
      setPlayed(seekOnReady);
    }
  }, [isReady, seekOnReady]);

  const handleReady = useCallback(() => setIsReady(true), []);

  // Fires on every ReactPlayer tick (~1s). Throttling for any DB persistence is
  // the caller's responsibility — here we only want the UI to feel real-time.
  const handleProgress = useCallback(({ playedSeconds }) => {
    const seconds = Math.floor(playedSeconds);
    setPlayed(seconds);
    onProgress?.(seconds);
  }, [onProgress]);

  const seekTo = useCallback((seconds) => {
    playerRef.current?.seekTo(seconds, "seconds");
    setPlayed(seconds);
  }, []);

  useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

  const isVideo = mediaType === mediaTypes.video;

  // The lock screen, the notification shade and the media keys (PRD MOB-3) —
  // driving the same state as the bar below. See useMediaSession.
  useMediaSession({
    media,
    active: isReady,
    playing,
    position: played,
    duration: effectiveDuration,
    playbackRate,
    onPlayingChange: setPlaying,
    onSeek: seekTo,
  });

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

  // ── Captions (PRD MOB-5) ────────────────────────────────────────────────────
  //
  // Drawn by the page rather than as a <track> on the media element: an audio
  // lesson plays in an <audio>, which shows no captions at all, and this way the
  // same line appears over a picture and over the empty stage of a recording,
  // in the same right-to-left type as the rest of the page.
  const [captionsOn, setCaptionsOn] = useState(readCaptionsOn);
  const toggleCaptions = useCallback(() => {
    setCaptionsOn((on) => { saveCaptionsOn(!on); return !on; });
  }, []);
  const hasCaptions = Boolean(captions?.cues?.length);
  const caption = hasCaptions && captionsOn ? captionAt(captions.cues, played) : null;

  return (
    // The BLACK belongs to a picture; the space does not. A lecture with no
    // picture was being painted a black rectangle it had nothing to put in, so
    // audio keeps the frame — the page is measured against it, and it is what
    // stands the bar level with the middle of the panel beside it — but not the
    // paint.
    <Box
      sx={{
        position: "relative",
        width: "100%",
        ...(isVideo && { bgcolor: "black", borderRadius: 2, overflow: "hidden" }),
      }}
    >
      {/* The stage: a 16:9 frame for BOTH, and only its treatment differs.
          Video fills it and the bar floats near the bottom, where a control bar
          belongs when there is a picture to keep clear. Audio leaves it empty
          and puts the bar in the middle of it.
          The frame is kept for audio even though there is nothing to frame,
          because it is what the rest of the page is measured against: the side
          panel matches this block's height, and a block that shrank to the
          height of its own control bar took the panel down with it. Reserving
          the space here — rather than compensating for its absence over there —
          is also what puts the bar level with the middle of the panel. */}
      <Box
        onPointerMove={isVideo ? wakeControls : undefined}
        // Leaving the picture is as clear a "done with the controls" as running
        // out of time, and waiting the full delay afterwards only leaves the bar
        // sitting on a frame nobody is pointing at.
        onPointerLeave={isVideo ? () => setPointerAwake(false) : undefined}
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: STAGE_ASPECT,
          display: "flex",
          justifyContent: "center",
          alignItems: isVideo ? "flex-end" : "center",
          p: 2,
        }}
      >
        {/* The media element stays rendered and playing in BOTH cases — a
            <video> for a picture, an <audio> for a lecture without one (see
            forceAudio below; it was a <video> for both until background play
            needed otherwise). What changes is its box. For video it fills the frame behind the bar; for
            audio it is kept to an invisible 1×1 — still laid out, still playing,
            but with no surface left to paint the black rectangle this change is
            here to remove. Not `display: none`, which would take its box away
            entirely and is a heavier promise to make about a playing element. */}
        {/* The picture itself is the play/pause target, the way it is in every
            player people already use. It works because this element and the bar
            are SIBLINGS rather than nested: a click on the bar lands on the bar
            and stops there, so pressing a button in it cannot also toggle
            playback behind it. */}
        <Box
          onClick={isVideo ? () => setPlaying((p) => !p) : undefined}
          sx={{
            position: "absolute",
            // "1px", not 1: in MUI's sx a bare number for width/height between
            // 0 and 1 is read as a PERCENTAGE, so `width: 1` would quietly mean
            // 100% and leave the element covering the whole row.
            ...(isVideo
              ? { inset: 0, cursor: "pointer" }
              : { width: "1px", height: "1px", overflow: "hidden", opacity: 0, pointerEvents: "none" }),
            "& video": { width: "100%", height: "100%", objectFit: "contain", display: "block" },
          }}
        >
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
            onProgress={handleProgress}
            onDuration={setLoadedDuration}
            onReady={handleReady}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            // The page moves on to the course's next lesson (PRD CRS-3).
            onEnded={() => { setPlaying(false); onEnded?.(); }}
            // An audio lesson as an <audio> element (PRD MOB-3). The stream URL
            // has no extension, so ReactPlayer would otherwise build a <video>
            // for it too — and a phone pauses a VIDEO when the screen locks or
            // the browser goes to the background, which made a shiur stop the
            // moment the phone went into a pocket. Audio is allowed to play on.
            config={{ file: { forceAudio: !isVideo } }}
          />
        </Box>

        {caption && (
          <Box
            data-testid="player-caption"
            dir="rtl"
            sx={{
              position: "absolute",
              left: 0,
              right: 0,
              zIndex: 1,
              display: "flex",
              justifyContent: "center",
              px: 2,
              pointerEvents: "none",
              // Over a picture, just above the bar — lower when the bar has
              // faded away. On a recording's empty stage, above the bar in the
              // middle of it.
              ...(isVideo
                ? { bottom: controlsVisible ? 76 : 20, transition: "bottom 220ms ease" }
                : { bottom: "calc(50% + 34px)" }),
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
                color: "#fff",
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
          <PlayerControls
            playing={playing}
            onTogglePlay={() => setPlaying((p) => !p)}
            volume={volume}
            muted={muted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
            played={scrubbing ? scrubValue : played}
            duration={effectiveDuration}
            onSeek={(v) => { setScrubbing(true); setScrubValue(v); }}
            onSeekCommit={(v) => { setScrubbing(false); seekTo(v); }}
            playbackRate={playbackRate}
            onRateChange={setPlaybackRate}
            media={media}
            transcript={transcript}
            // Whether the bar has black behind it. Its glass colouring assumes
            // it does; standing on the page instead, it needs to be opaque
            // enough to stay legible in either theme.
            overPicture={isVideo}
            // Keeps the bar up while its own menus are open — see PlayerControls.
            onBusyChange={setControlsBusy}
            captionsAvailable={hasCaptions}
            captionsOn={captionsOn}
            onToggleCaptions={toggleCaptions}
          />
        </Box>
      </Box>
      {/* No strip of bookmark pins under the stage. They sat on the page as
          little flags with nothing around them to say what they were, and on an
          audio lecture — where the stage is empty anyway — a row of markers
          floating over blank space read as damage rather than as a feature. The
          same bookmarks are listed, with their times and their text, in the
          notes panel beside the player, which is where they can be understood. */}
    </Box>
  );
});

MediaPlayer.displayName = "MediaPlayer";

export default MediaPlayer;
