import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { createBookmark } from "../../../../store/slicesAndThunks/bookmarksSlice/bookmarksPost";
import { mediaApi } from "../../../../api/mediaApi";

// What the floating lesson window loads and writes — its own lesson, and a
// bookmark made in it, in a recording or in a book — so that
// SourcePreviewDialog.jsx does not dispatch.
/**
 * @param {{ open: boolean, mediaId: number|string }} props
 */
export const useSourcePreview = ({ open, mediaId }) => {
  const dispatch = useDispatch();
  const [media, setMedia] = useState(null);
  const [error, setError] = useState(false);

  // Fetched here rather than through the media slice on purpose: that slice's
  // selectedItem belongs to the media page, and writing this preview into it
  // would leave the wrong lecture behind for the next visit there.
  useEffect(() => {
    if (!open || !mediaId) return;
    let cancelled = false;
    setMedia(null);
    setError(false);
    mediaApi
      .getOne(mediaId)
      .then((data) => { if (!cancelled) setMedia(data); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [open, mediaId]);

  // Marking a spot has to work from here too, not only from the full lecture
  // page — this window is where the user is listening. The new bookmark goes
  // into the shared slice, which is the same list the notebook renders behind
  // this window, so it appears there immediately and under the right lecture.
  const handleCreateBookmark = useCallback((timestampSeconds, note) => {
    if (!media?.id) return;
    dispatch(createBookmark({ mediaId: Number(media.id), timestampSeconds, note }));
  }, [dispatch, media?.id]);

  // The same act for a book, in the other coordinate space. A separate function
  // rather than one taking either, for the reason the lecture page gives: an
  // offset and a number of seconds are both integers, and one function accepting
  // both is one call site away from storing a position as a timestamp.
  const handleCreateTextBookmark = useCallback(({
    chunkId: chunk, charPosition, charEnd, quotedText, note, pageNumber, rect,
  }) => {
    if (!media?.id) return;
    return dispatch(createBookmark({
      mediaId: Number(media.id),
      chunkId: chunk,
      charPosition,
      charEnd,
      quotedText,
      note,
      pageNumber,
      rect,
    }));
  }, [dispatch, media?.id]);

  return { media, error, handleCreateBookmark, handleCreateTextBookmark };
};
