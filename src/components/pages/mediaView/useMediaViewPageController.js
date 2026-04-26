import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { fetchOneMedia } from "../../../store/slicesAndThunks/mediaSlice/mediaGet";
import { fetchTranscript } from "../../../store/slicesAndThunks/transcriptSlice/transcriptGet";
import { fetchBookmarks } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksGet";
import { createBookmark } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksPost";
import { selectSelectedMedia } from "../../../store/selectors/mediaSelectors";
import { selectTranscriptByMediaId } from "../../../store/selectors/transcriptSelectors";
import { selectBookmarksByMediaId } from "../../../store/selectors/bookmarksSelectors";
import axiosInstance from "../../../utilities/axiosInstance";

const useMediaViewPageController = () => {
  const dispatch = useDispatch();
  const { id } = useParams();

  const media = useSelector(selectSelectedMedia);
  const transcript = useSelector(selectTranscriptByMediaId(id));
  const bookmarks = useSelector(selectBookmarksByMediaId(id));

  useEffect(() => {
    if (id) {
      dispatch(fetchOneMedia(id));
      dispatch(fetchTranscript(id)).catch(() => {});
      dispatch(fetchBookmarks(id));
    }
  }, [dispatch, id]);

  const handleSaveProgress = async (positionSeconds) => {
    try {
      await axiosInstance.post(`/media/${id}/progress`, { positionSeconds });
    } catch {}
  };

  const handleCreateBookmark = (timestampSeconds, note) =>
    dispatch(createBookmark({ mediaId: Number(id), timestampSeconds, note }));

  return { media, transcript, bookmarks, handleSaveProgress, handleCreateBookmark };
};

export default useMediaViewPageController;
