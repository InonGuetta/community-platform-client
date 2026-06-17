import { useEffect, useState } from "react";
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
import axiosInstance from "../../../utilities/axiosInstance";

const TRANSCRIPT_POLL_MS = 4000;
const IN_FLIGHT_STATUSES = new Set(["pending", "processing"]);

const useMediaViewPageController = () => {
  const dispatch = useDispatch();
  const { id } = useParams();

  const media = useSelector(selectSelectedMedia);
  const transcript = useSelector(selectTranscriptByMediaId(id));
  const bookmarks = useSelector(selectBookmarksByMediaId(id));

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
        const { data } = await axiosInstance.get(`/media/${id}/progress`);
        if (!cancelled && data?.last_position_seconds > 0) {
          setResumePosition(data.last_position_seconds);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (
      media?.id &&
      String(media.id) === String(id) &&
      media.media_type !== "text"
    ) {
      console.log(`[FE:ctrl] media ready id=${id} type=${media.media_type} → initial fetchTranscript`);
      dispatch(fetchTranscript(id)).catch(() => {});
    }
  }, [dispatch, id, media?.id, media?.media_type]);

  // While Whisper/LLM workers are processing, the transcript row sits in
  // status='pending' or 'processing'. Poll every 4s until it lands on
  // 'done' / 'error', then stop. Cleared on unmount or id change.
  useEffect(() => {
    if (!id || !transcript || !IN_FLIGHT_STATUSES.has(transcript.status)) return;
    console.log(`[FE:ctrl] polling started id=${id} status=${transcript.status} every ${TRANSCRIPT_POLL_MS}ms`);
    const interval = setInterval(() => {
      console.log(`[FE:ctrl] polling tick id=${id}`);
      dispatch(fetchTranscript(id)).catch(() => {});
    }, TRANSCRIPT_POLL_MS);
    return () => {
      console.log(`[FE:ctrl] polling stopped id=${id}`);
      clearInterval(interval);
    };
  }, [dispatch, id, transcript?.status]);

  const handleSaveProgress = async (positionSeconds) => {
    try {
      await axiosInstance.post(`/media/${id}/progress`, { positionSeconds });
    } catch {}
  };

  const handleCreateBookmark = (timestampSeconds, note) =>
    dispatch(createBookmark({ mediaId: Number(id), timestampSeconds, note }));

  return { media, transcript, bookmarks, resumePosition, handleSaveProgress, handleCreateBookmark };
};

export default useMediaViewPageController;
