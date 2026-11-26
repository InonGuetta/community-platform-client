import { useCallback, useEffect, useRef, useState } from "react";
import useMediaSession, { SKIP_SECONDS } from "./useMediaSession";

// The state of one playing lesson — what MediaPlayer had inside it, taken out
// so the bottom player (features/NowPlaying, D-145) drives a media element with
// exactly the same rules instead of a second copy of them: resuming once the
// file is ready, volume and mute kept apart, the scrub bar following the hand
// while it drags, speed, the lock screen (useMediaSession).
//
// The caller renders the <ReactPlayer> itself (it decides where the picture
// goes) and spreads `playerEvents` on it, with `ref={playerRef}`.

export const SPEED_OPTIONS = [0.5, 1, 1.5, 2];
export { SKIP_SECONDS };

// Only one lesson plays at a time. Whichever player starts says so on the
// window, and every other one pauses — the lesson page and the bottom player
// can both be on screen, with different lessons in them.
export const PLAYBACK_CLAIM_EVENT = "app:playback-claim";

/**
 * @param {object} options
 * @param {string|null} options.url         the stream; a new one starts afresh
 * @param {object|null} options.media       the lesson row (lock screen, duration)
 * @param {number} [options.seekOnReady]    seconds to start from, once ready
 * @param {boolean} [options.playOnReady]   start playing once ready (a handover, the bottom player)
 * @param {number|null} [options.initialRate] the speed it was playing at elsewhere
 * @param {(seconds: number) => void} [options.onProgress]
 * @param {() => void} [options.onEnded]
 */
const usePlayback = ({ url, media, seekOnReady = 0, playOnReady = false, initialRate = null, onProgress, onEnded }) => {
  const duration = media?.duration_seconds;
  const playerRef = useRef(null);
  const [playbackRate, setPlaybackRate] = useState(initialRate || 1);
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

  // Auto-seek (deep link ?t=, Resume Playback, a handover) must happen exactly
  // once, and only after the media is ready — seekTo before load is a no-op.
  // seekOnReady can also arrive late (the resume position is fetched async), so
  // we react to both "became ready" and "value arrived" via an effect. The ref
  // guards against re-seeking on later renders, which would fight a user who
  // manually rewinds. It resets per source so a new media item resumes again.
  const hasAutoSeekedRef = useRef(false);
  const hasAutoPlayedRef = useRef(false);
  const playedRef = useRef(0);
  useEffect(() => {
    hasAutoSeekedRef.current = false;
    hasAutoPlayedRef.current = false;
    playedRef.current = 0;
    setIsReady(false);
    setPlaying(false);
    setPlayed(0);
    setLoadedDuration(0);
  }, [url]);

  useEffect(() => {
    if (isReady && seekOnReady > 0 && !hasAutoSeekedRef.current) {
      hasAutoSeekedRef.current = true;
      playerRef.current?.seekTo(seekOnReady, "seconds");
      playedRef.current = seekOnReady;
      setPlayed(seekOnReady);
    }
  }, [isReady, seekOnReady]);

  // Started for the reader: the bottom player once its resume position is
  // known, and the lesson page when it takes over a lesson that was playing.
  useEffect(() => {
    if (isReady && playOnReady && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      setPlaying(true);
    }
  }, [isReady, playOnReady]);

  // The speed it was playing at before a handover — arrives with it.
  useEffect(() => {
    if (initialRate) setPlaybackRate(initialRate);
  }, [initialRate]);

  const handleReady = useCallback(() => setIsReady(true), []);

  // Fires on every ReactPlayer tick (~1s). Throttling for any DB persistence is
  // the caller's responsibility — here we only want the UI to feel real-time.
  const handleProgress = useCallback(({ playedSeconds }) => {
    const seconds = Math.floor(playedSeconds);
    playedRef.current = seconds;
    setPlayed(seconds);
    onProgress?.(seconds);
  }, [onProgress]);

  const seekTo = useCallback((seconds) => {
    playerRef.current?.seekTo(seconds, "seconds");
    playedRef.current = seconds;
    setPlayed(seconds);
  }, []);

  // The skip buttons (and the lock screen's, through useMediaSession).
  const seekBy = useCallback((delta) => {
    const length = effectiveDuration || Infinity;
    seekTo(Math.max(0, Math.min(length, playedRef.current + delta)));
  }, [effectiveDuration, seekTo]);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  const scrub = useCallback((v) => { setScrubbing(true); setScrubValue(v); }, []);
  const commitScrub = useCallback((v) => { setScrubbing(false); seekTo(v); }, [seekTo]);

  // One lesson at a time — see PLAYBACK_CLAIM_EVENT. The token is this
  // player's identity; an object, so no two players can share one.
  const [token] = useState(() => ({}));
  useEffect(() => {
    if (!playing) return;
    window.dispatchEvent(new CustomEvent(PLAYBACK_CLAIM_EVENT, { detail: token }));
  }, [playing, token]);
  useEffect(() => {
    const onClaim = (e) => { if (e.detail !== token) setPlaying(false); };
    window.addEventListener(PLAYBACK_CLAIM_EVENT, onClaim);
    return () => window.removeEventListener(PLAYBACK_CLAIM_EVENT, onClaim);
  }, [token]);

  // The lock screen, the notification shade and the media keys (PRD MOB-3) —
  // driving the same state as the bar. See useMediaSession.
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

  const handleEnded = useCallback(() => { setPlaying(false); onEnded?.(); }, [onEnded]);

  return {
    playerRef,
    isReady,
    playing,
    setPlaying,
    togglePlay,
    // Where the lesson is, and where the scrub bar should show it.
    position: played,
    shownPosition: scrubbing ? scrubValue : played,
    duration: effectiveDuration,
    volume,
    muted,
    handleVolumeChange,
    handleToggleMute,
    playbackRate,
    setPlaybackRate,
    seekTo,
    seekBy,
    scrub,
    commitScrub,
    playerEvents: {
      onProgress: handleProgress,
      onDuration: setLoadedDuration,
      onReady: handleReady,
      onPlay: () => setPlaying(true),
      onPause: () => setPlaying(false),
      onEnded: handleEnded,
    },
  };
};

export default usePlayback;
