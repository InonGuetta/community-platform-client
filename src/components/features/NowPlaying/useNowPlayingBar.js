import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { selectNowPlayingItem } from "../../../store/selectors/nowPlayingSelectors";
import { closeBar, handOverToPage } from "../../../store/slicesAndThunks/nowPlayingSlice/nowPlayingSlice";
import { markContinueWatchingStale } from "../../../store/slicesAndThunks/mediaSlice/mediaSlice";
import { mediaApi } from "../../../api/mediaApi";
import usePlayback, { SKIP_SECONDS } from "../MediaPlayer/usePlayback";
import usePlaybackProgress from "../MediaPlayer/usePlaybackProgress";

// The bottom player's logic (D-145). Everything that plays is the lesson
// page's own code — usePlayback for the element, usePlaybackProgress for the
// saved position — so the bar resumes, saves and keeps "המשך צפייה" exactly
// as the page does. What is the bar's alone is in here:
//
//   - it starts playing by itself, once the saved position is known;
//   - it saves at once when it closes or is replaced, and then asks for the
//     "continue watching" list again, so the archive's hero shows it;
//   - when the lesson's own page opens — by its "expand" button or any other
//     link — it hands the lesson over (handOverToPage) and steps aside, so
//     the lesson never plays in two elements at once.

export const lessonPath = (id) => `/media/${id}`;

const useNowPlayingBar = ({ closeHere = false } = {}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const item = useSelector(selectNowPlayingItem);
  const id = item?.id ?? null;

  const { resumePosition, resumeSettled, reportProgress, saveNow } = usePlaybackProgress(id);

  const handleEnded = useCallback(() => {
    saveNow(Number(item?.duration_seconds) || 0);
  }, [saveNow, item?.duration_seconds]);

  const playback = usePlayback({
    url: id != null ? mediaApi.streamUrl(id) : null,
    media: item,
    seekOnReady: resumePosition,
    // Not before the saved position is in: starting from 0 and then jumping
    // to minute forty would be a moment of the wrong lecture.
    playOnReady: resumeSettled,
    onProgress: reportProgress,
    onEnded: handleEnded,
  });

  // The values a cleanup or a handover needs at the moment it happens.
  const latest = useRef({ position: 0, playing: false, rate: 1 });
  useEffect(() => {
    latest.current = { position: playback.position, playing: playback.playing, rate: playback.playbackRate };
  });

  // Closing, replacing or handing over: the position is saved now rather than
  // at the next ten-second mark that will never come, and then the "continue
  // watching" list is read again.
  useEffect(() => {
    if (id == null) return undefined;
    return () => {
      saveNow(latest.current.position).finally(() => dispatch(markContinueWatchingStale()));
    };
  }, [id, saveNow, dispatch]);

  // The lesson's own page takes over.
  useEffect(() => {
    if (id == null || pathname !== lessonPath(id)) return;
    dispatch(handOverToPage({ ...latest.current }));
  }, [pathname, id, dispatch]);

  // A screen with no room for it (App decides: a live session's room).
  useEffect(() => {
    if (closeHere && id != null) dispatch(closeBar());
  }, [closeHere, id, dispatch]);

  const expand = useCallback(() => { if (id != null) navigate(lessonPath(id)); }, [id, navigate]);
  const close = useCallback(() => dispatch(closeBar()), [dispatch]);
  const skipBack = useCallback(() => playback.seekBy(-SKIP_SECONDS), [playback]);
  const skipForward = useCallback(() => playback.seekBy(SKIP_SECONDS), [playback]);

  return {
    item,
    url: id != null ? mediaApi.streamUrl(id) : null,
    ...playback,
    skipSeconds: SKIP_SECONDS,
    skipBack,
    skipForward,
    expand,
    close,
  };
};

export default useNowPlayingBar;
