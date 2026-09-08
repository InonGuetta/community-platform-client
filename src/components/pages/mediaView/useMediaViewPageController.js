import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useSearchParams } from "react-router-dom";
import { openingPageFrom, TIME_PARAM } from "../../../utilities/deepLink";
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

  // The same action for a book. A separate function rather than a nullable
  // argument on the one above, because the two anchor in DIFFERENT coordinate
  // spaces — seconds and character offsets — and one function taking either is
  // one call site away from sending an offset as a timestamp.
  //
  // Takes the whole anchor as an object. The reader produces one of three
  // shapes now — a passage in the extracted text, a paragraph, or a rectangle on
  // a page of the original — and spreading it keeps this function from having to
  // know which, or from growing a positional argument per field. `truncated` is
  // the viewer's own UI concern and is dropped here rather than sent.
  const handleCreateTextBookmark = ({
    chunkId, charPosition, charEnd, quotedText, note, pageNumber, rect,
  }) =>
    dispatch(createBookmark({
      mediaId: Number(id),
      chunkId,
      charPosition,
      charEnd,
      quotedText,
      note,
      pageNumber,
      rect,
    }));

  // Where the reader should scroll. Set by clicking a bookmark, and the object
  // wrapper is deliberate: clicking the SAME bookmark twice must scroll again,
  // and a bare value would be an unchanged one the effect ignores.
  //
  // It carries the BOOKMARK, not its offset. The reader resolves the paragraph
  // through chunk_id, which is a fact the row carries, rather than by searching
  // for a chunk whose range contains the offset — a search that still finds
  // something after a book is re-extracted, and finds the wrong thing.
  //
  // `?page=` seeds it, and that is the whole of "open the book where I was".
  // A page from a link is a place in exactly the sense a bookmark is, so it is
  // expressed in the shape the viewer already resolves — page and no rectangle,
  // which is what it does for a bookmark that names a page and nothing finer.
  // No second mechanism, and no second thing to keep in step.
  //
  // Read once, in the initialiser: a link is a starting position, not a leash.
  // Re-reading it would drag a reader who has scrolled on back to where they
  // arrived, every time anything re-rendered.
  const [searchParams] = useSearchParams();
  const [readerTarget, setReaderTarget] = useState(() => {
    const page = openingPageFrom(searchParams);
    return page ? { bookmark: { page_number: page } } : null;
  });
  // Clicking a bookmark afterwards simply replaces it — last one wins, which is
  // the right precedence and costs nothing to arrange.
  const jumpToBookmark = (bookmark) => setReaderTarget({ bookmark });

  // ── Playback position ──────────────────────────────────────────────────────

  const [currentTime, setCurrentTime] = useState(0);
  const lastSavedAtRef = useRef(0);

  // Smart-search deep link: /media/:id?t=SECONDS starts the player there. An
  // explicit link wins over Resume Playback; otherwise fall back to the saved
  // position so the player picks up where the viewer left off.
  const seekOnReady = Number(searchParams.get(TIME_PARAM)) || resumePosition;

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
    handleCreateTextBookmark, readerTarget, jumpToBookmark,
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
