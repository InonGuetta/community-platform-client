import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { fetchOneMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaGet";
import { fetchTranscript } from "../../../store/slicesAndThunks/transcriptSlice/transcriptGet";
import { fetchBookmarks } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksGet";
import { createBookmark } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksPost";
import { clearSelectedItem } from "../../../store/slicesAndThunks/mediaSlice/mediaSlice";
import { selectSelectedMedia } from "../../../store/selectors/mediaSelectors";
import { selectTranscriptByMediaId } from "../../../store/selectors/transcriptSelectors";
import { selectBookmarksByMediaId } from "../../../store/selectors/bookmarksSelectors";
import { mediaApi } from "../../../api/mediaApi";
import { nextPollDelay, hasExceededPollWindow } from "../../../utilities/pollingSchedule";

// 'analyzing' is included so polling continues through the AI step. Without it
// the page stopped watching the moment transcription finished, and the summary
// — written afterwards by the LLM worker — never appeared without a reload.
const IN_FLIGHT_STATUSES = new Set(["pending", "processing", "analyzing"]);

const useMediaViewPageController = () => {
  const dispatch = useDispatch();
  const { id } = useParams();

  const media = useSelector(selectSelectedMedia);

  // These are selector FACTORIES: calling them inline built a fresh
  // createSelector on every render, so its memoisation never applied. For the
  // bookmarks one that mattered — it ends in .filter(), which returns a new
  // array each call, so useSelector saw a new reference after every action
  // dispatched anywhere in the app and re-rendered this page and its whole
  // subtree. Memoising per id keeps one instance alive, which then returns a
  // stable reference while the underlying list is unchanged.
  const selectTranscript = useMemo(() => selectTranscriptByMediaId(id), [id]);
  const selectBookmarks = useMemo(() => selectBookmarksByMediaId(id), [id]);
  const transcript = useSelector(selectTranscript);
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

  // Text media is included now that books get summarised too. A document with
  // no summary yet simply has no transcripts row, so this 404s and the thunk
  // rejects — which is the correct "nothing here yet" and is already handled.
  useEffect(() => {
    if (media?.id && String(media.id) === String(id)) {
      dispatch(fetchTranscript(id)).catch(() => {});
    }
  }, [dispatch, id, media?.id]);

  // True once polling has given up — see pollingSchedule.js for why that can
  // happen while the row still says 'processing'.
  const [pollingStalled, setPollingStalled] = useState(false);
  // Bumping this restarts the poll after the user asks to check again.
  const [pollAttemptEpoch, setPollAttemptEpoch] = useState(0);

  const retryPolling = useCallback(() => setPollAttemptEpoch((n) => n + 1), []);

  useEffect(() => {
    setPollingStalled(false);
  }, [id]);

  // While the workers are running, the transcript row sits in 'pending' or
  // 'processing'. Poll until it reaches 'done' / 'error', with the gap growing
  // so a long job is not hammered, and a hard ceiling so a wedged worker cannot
  // keep this running forever.
  //
  // A self-scheduling timeout rather than setInterval: the delay changes between
  // ticks, and this way a slow response can never overlap the next request.
  useEffect(() => {
    if (!id || !transcript || !IN_FLIGHT_STATUSES.has(transcript.status)) return;

    let timer = null;
    let attempt = 0;
    let cancelled = false;
    const startedAt = Date.now();

    const schedule = () => {
      if (cancelled) return;
      if (hasExceededPollWindow(startedAt)) {
        setPollingStalled(true);
        return;
      }
      // Nothing is watching a hidden tab, and browsers throttle these anyway.
      // Leaving `timer` null lets the visibility listener pick it back up.
      if (document.hidden) return;
      timer = setTimeout(tick, nextPollDelay(attempt++));
    };

    const tick = async () => {
      timer = null;
      if (cancelled) return;
      await dispatch(fetchTranscript(id));
      schedule();
    };

    // Coming back to the tab should show the current state immediately rather
    // than after another backed-off wait.
    const handleVisibilityChange = () => {
      if (cancelled || document.hidden || timer !== null) return;
      tick();
    };

    schedule();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // Depends on transcript?.status, deliberately NOT on transcript. Every poll
    // returns a new object, so depending on the whole thing would tear this
    // effect down and rebuild it on every response — resetting the backoff and
    // the ceiling clock each time, and defeating the point of both. Only a
    // change of status should restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, id, transcript?.status, pollAttemptEpoch]);

  const handleSaveProgress = async (positionSeconds) => {
    try {
      await mediaApi.saveProgress(id, positionSeconds);
    } catch {}
  };

  const handleCreateBookmark = (timestampSeconds, note) =>
    dispatch(createBookmark({ mediaId: Number(id), timestampSeconds, note }));

  return {
    media, transcript, bookmarks, resumePosition,
    handleSaveProgress, handleCreateBookmark,
    pollingStalled, retryPolling,
  };
};

export default useMediaViewPageController;
