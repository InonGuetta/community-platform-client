import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useSearchParams } from "react-router-dom";
import { fetchOneMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaGet";
import { fetchBookmarks } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksGet";
import { createBookmark } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksPost";
import { clearSelectedItem } from "../../../store/slicesAndThunks/mediaSlice/mediaSlice";
import { selectSelectedMedia } from "../../../store/selectors/mediaSelectors";
import { selectBookmarksByMediaId } from "../../../store/selectors/bookmarksSelectors";
import { mediaApi } from "../../../api/mediaApi";
import useMediaInsights from "./useMediaInsights";
import useMediaLike from "./useMediaLike";
import useMediaSave from "./useMediaSave";

// Everything on this page that dispatches, selects or derives from the server's
// data. The page component keeps only what is genuinely presentational — which
// tab is open, whether a dialog is showing, the measured height of the media
// block — and receives the rest from here.
//
// The split had drifted: the component held seven pieces of state, dispatched
// six thunks of its own and read two selectors directly, so "page logic lives in
// the controller" was true of the half that happened to be written first. A
// reader following the convention looked in the wrong file.
//
// The line used here: **does it dispatch or select?** If yes it belongs in this
// file. `playerRef` deliberately fails that test and stays in the component,
// because a ref has to be created where the element it points at is rendered.

// How often a playing position is persisted. The player reports progress every
// ~1s; writing that straight through would be a request per second per viewer,
// for a value nobody reads until the next visit.
const SAVE_PROGRESS_EVERY_MS = 10000;

const useMediaViewPageController = () => {
  const dispatch = useDispatch();
  const { id } = useParams();

  const media = useSelector(selectSelectedMedia);

  // Everything behind the summary / chapters / transcript tabs now lives in a
  // hook of its own, because the notebook's source preview shows the same block
  // and the polling loop inside it is not something to keep two copies of.
  const insights = useMediaInsights(id, media);

  // This is a selector FACTORY: calling it inline built a fresh createSelector
  // on every render, so its memoisation never applied. Here that mattered — it
  // ends in .filter(), which returns a new array each call, so useSelector saw
  // a new reference after every action dispatched anywhere in the app and
  // re-rendered this page and its whole subtree. Memoising per id keeps one
  // instance alive, which then returns a stable reference while the underlying
  // list is unchanged.
  const selectBookmarks = useMemo(() => selectBookmarksByMediaId(id), [id]);
  const bookmarks = useSelector(selectBookmarks);

  // Resume Playback: the saved position (seconds) from a previous viewing.
  // The player seeks here once it's ready. 0 = start from the beginning.
  const [resumePosition, setResumePosition] = useState(0);

  useEffect(() => {
    dispatch(clearSelectedItem());
    setResumePosition(0);
    if (id) {
      dispatch(fetchOneMedia(id));
      dispatch(fetchBookmarks(id));
    }
  }, [dispatch, id]);

  // Fetch where this user left off so the player can resume there. Failures
  // (no progress yet, network) are silent — we just start from the beginning.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await mediaApi.getProgress(id);
        if (!cancelled && data?.last_position_seconds > 0) {
          setResumePosition(data.last_position_seconds);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCreateBookmark = (timestampSeconds, note) =>
    dispatch(createBookmark({ mediaId: Number(id), timestampSeconds, note }));

  // ── Playback position ──────────────────────────────────────────────────────

  const [currentTime, setCurrentTime] = useState(0);
  const lastSavedAtRef = useRef(0);

  // Smart-search deep link: /media/:id?t=SECONDS starts the player there. An
  // explicit link wins over Resume Playback; otherwise fall back to the saved
  // position so the player picks up where the viewer left off.
  const [searchParams] = useSearchParams();
  const seekOnReady = Number(searchParams.get("t")) || resumePosition;

  // currentTime updates on every tick because the notes panel and the share
  // dialog both show it; the DB write is throttled, because they are not the
  // same need. Failures are silent — losing a position is not worth a toast.
  const handlePlayerProgress = useCallback((seconds) => {
    setCurrentTime(seconds);
    const now = Date.now();
    if (now - lastSavedAtRef.current < SAVE_PROGRESS_EVERY_MS) return;
    lastSavedAtRef.current = now;
    mediaApi.saveProgress(id, seconds).catch(() => {});
  }, [id]);

  // ── Likes ──────────────────────────────────────────────────────────────────

  // Each in a hook of its own because the actions bar they feed is also rendered
  // by the notebook's source preview, which has no controller to ask.
  const { isLiked, toggleLike } = useMediaLike(media?.id);

  // ── Saves ──────────────────────────────────────────────────────────────────

  const { isSaved, toggleSave } = useMediaSave(media?.id);

  return {
    media, bookmarks,
    seekOnReady, currentTime, handlePlayerProgress,
    handleCreateBookmark,
    isLiked, toggleLike,
    isSaved, toggleSave,
    // Spread rather than nested, so the page keeps reading `isText` and the
    // rest straight off the controller as it always has.
    ...insights,
  };
};

export default useMediaViewPageController;
