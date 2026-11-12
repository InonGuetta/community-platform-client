import { useCallback, useEffect, useRef, useState } from "react";
import useMediaSession from "../../features/MediaPlayer/useMediaSession";
import { offlineFile, offlinePosition, saveOfflinePosition } from "../../../utilities/offlineStore";

// Playing a lesson saved on the device (PRD MOB-2), with no server involved.
//
// The saved file is handed to <audio> as a blob: URL, which seeks like any file
// and needs no service worker. Where the listener stopped is kept beside the
// lesson on the device, every few seconds and on pause, and is where the next
// play starts. The lock screen gets the same treatment as on the lesson page
// (useMediaSession, PRD MOB-3) — offline is where a phone in a pocket is most
// likely.

// Often enough that a phone killing the tab loses little; rarely enough that it
// is not a localStorage write per frame.
const SAVE_EVERY_SECONDS = 5;

// Near the end counts as finished: the next play starts from the beginning.
const FINISHED_WITHIN_SECONDS = 5;

export const resumeAt = (saved, duration) =>
  Number.isFinite(duration) && saved > 0 && saved < duration - FINISHED_WITHIN_SECONDS ? saved : 0;

export const PLAYBACK_RATES = [1, 1.25, 1.5, 2];

export const useOfflinePlayer = (item) => {
  const audioRef = useRef(null);
  const lastSaved = useRef(0);
  const [src, setSrc] = useState(null);
  const [missing, setMissing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);

  const id = item?.id;

  useEffect(() => {
    if (id == null) return undefined;
    let url = null;
    let current = true;
    setSrc(null);
    setMissing(false);
    offlineFile(id).then((blob) => {
      if (!current) return;
      if (!blob) {
        setMissing(true);
        return;
      }
      url = URL.createObjectURL(blob);
      setSrc(url);
    });
    return () => {
      current = false;
      // The blob: URL holds the whole file in reach of the page until revoked.
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  const remember = useCallback((seconds) => {
    lastSaved.current = seconds;
    saveOfflinePosition(id, seconds);
  }, [id]);

  const onLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
    audio.playbackRate = rate;
    const start = resumeAt(offlinePosition(id), audio.duration);
    if (start) audio.currentTime = start;
    lastSaved.current = start;
    // Pressing play on the list is the gesture that allows this.
    audio.play().catch(() => {});
  };

  const onTimeUpdate = () => {
    const at = audioRef.current?.currentTime ?? 0;
    setPosition(at);
    if (Math.abs(at - lastSaved.current) >= SAVE_EVERY_SECONDS) remember(at);
  };

  const onPause = () => {
    setPlaying(false);
    remember(audioRef.current?.currentTime ?? 0);
  };

  const onEnded = () => {
    setPlaying(false);
    remember(0);
  };

  const setPlayingFromOutside = useCallback((next) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (next) audio.play().catch(() => {});
    else audio.pause();
  }, []);

  const seek = useCallback((seconds) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  const changeRate = (next) => {
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  useMediaSession({
    media: item,
    active: Boolean(src),
    playing,
    position,
    duration,
    playbackRate: rate,
    onPlayingChange: setPlayingFromOutside,
    onSeek: seek,
  });

  return {
    audioRef,
    src,
    missing,
    rate,
    changeRate,
    audioProps: {
      onLoadedMetadata,
      onTimeUpdate,
      onPlay: () => setPlaying(true),
      onPause,
      onEnded,
    },
  };
};
