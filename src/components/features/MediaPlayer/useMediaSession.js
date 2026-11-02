import { useEffect, useRef } from "react";
import { defaultCreatorName } from "../../../utilities/constant";

// Playing in the background, and from the lock screen (PRD MOB-3).
//
// The Media Session API is what puts a lesson's name, its lecturer and the
// app's icon on a phone's lock screen and in the notification shade, with play,
// pause and skip buttons that work while the browser is in the background —
// and what makes the headphone and keyboard media keys control this player
// rather than nothing. A browser without it ignores all of this.
//
// The player stays the owner of its state: these handlers call the same
// functions its own buttons do, so the lock screen and the page cannot disagree
// about whether the lesson is playing or where it is.

// How far the lock screen's skip buttons jump when the browser does not say.
// Fifteen seconds: enough to re-hear a sentence, short enough not to lose one.
export const SKIP_SECONDS = 15;

const ARTWORK = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
];

// What the lock screen says. The lecturer only when there is one — "כללי" is
// the archive's word for "not recorded", not a name to show on a phone.
export const mediaSessionMetadata = (media) => ({
  title: media?.title || "שיעור",
  artist: media?.creator_name && media.creator_name !== defaultCreatorName ? media.creator_name : "",
  album: media?.course_title || "פלטפורמת הקהילה",
  artwork: media?.thumbnail_url ? [{ src: media.thumbnail_url }, ...ARTWORK] : ARTWORK,
});

// The lock screen's progress bar. setPositionState throws on a position past
// the duration or a duration that is not a positive number — both happen
// briefly while a file loads — so those moments are simply not reported.
export const positionState = (duration, position, playbackRate) => {
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return {
    duration,
    playbackRate: playbackRate > 0 ? playbackRate : 1,
    position: Math.min(Math.max(0, position || 0), duration),
  };
};

const session = () => (typeof navigator !== "undefined" ? navigator.mediaSession : undefined);

/**
 * @param {object} options
 * @param {object} options.media           the lesson row
 * @param {boolean} options.active          a source is loaded and ready
 * @param {boolean} options.playing
 * @param {number} options.position         seconds
 * @param {number} options.duration         seconds
 * @param {number} options.playbackRate
 * @param {(playing: boolean) => void} options.onPlayingChange
 * @param {(seconds: number) => void} options.onSeek
 */
const useMediaSession = ({ media, active, playing, position, duration, playbackRate, onPlayingChange, onSeek }) => {
  // The handlers are registered once per lesson; they read the latest values
  // through this ref rather than being re-registered on every tick.
  const latest = useRef({ position, duration, onPlayingChange, onSeek });
  useEffect(() => {
    latest.current = { position, duration, onPlayingChange, onSeek };
  });

  const title = media?.title;
  const creator = media?.creator_name;
  const course = media?.course_title;
  const thumbnail = media?.thumbnail_url;

  useEffect(() => {
    const ms = session();
    if (!ms || !active) return undefined;
    if (typeof window.MediaMetadata === "function") {
      ms.metadata = new window.MediaMetadata(mediaSessionMetadata({ title, creator_name: creator, course_title: course, thumbnail_url: thumbnail }));
    }

    const seekBy = (delta) => {
      const { position: at, duration: length, onSeek: seek } = latest.current;
      const target = Math.max(0, Math.min(length || Infinity, (at || 0) + delta));
      seek?.(target);
    };
    const handlers = {
      play: () => latest.current.onPlayingChange?.(true),
      pause: () => latest.current.onPlayingChange?.(false),
      stop: () => latest.current.onPlayingChange?.(false),
      seekbackward: (details) => seekBy(-(details?.seekOffset || SKIP_SECONDS)),
      seekforward: (details) => seekBy(details?.seekOffset || SKIP_SECONDS),
      seekto: (details) => {
        if (Number.isFinite(details?.seekTime)) latest.current.onSeek?.(details.seekTime);
      },
    };
    for (const [action, handler] of Object.entries(handlers)) {
      // A browser that does not support one action throws for it; the others
      // still work.
      try { ms.setActionHandler(action, handler); } catch { /* unsupported action */ }
    }

    return () => {
      for (const action of Object.keys(handlers)) {
        try { ms.setActionHandler(action, null); } catch { /* unsupported action */ }
      }
      // Leaving the lesson takes it off the lock screen.
      ms.metadata = null;
      ms.playbackState = "none";
    };
  }, [active, title, creator, course, thumbnail]);

  useEffect(() => {
    const ms = session();
    if (!ms || !active) return;
    ms.playbackState = playing ? "playing" : "paused";
  }, [active, playing]);

  useEffect(() => {
    const ms = session();
    if (!ms || !active || typeof ms.setPositionState !== "function") return;
    const state = positionState(duration, position, playbackRate);
    if (!state) return;
    try { ms.setPositionState(state); } catch { /* a value the browser refused */ }
  }, [active, duration, position, playbackRate]);
};

export default useMediaSession;
