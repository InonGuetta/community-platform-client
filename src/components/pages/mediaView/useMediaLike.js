import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchLikedIds } from "../../../store/slicesAndThunks/likesSlice/likesGet";
import { likeMedia } from "../../../store/slicesAndThunks/likesSlice/likesPost";
import { unlikeMedia } from "../../../store/slicesAndThunks/likesSlice/likesDelete";

// Whether this viewer has liked a given lecture, and the toggle for it.
//
// Lives apart from useMediaViewPageController for the same reason
// useMediaInsights does: the media page is no longer the only screen with a like
// button on it — the notebook's floating source preview carries the same actions
// bar, and "am I liked" is a question both have to answer identically.
const useMediaLike = (mediaId) => {
  const dispatch = useDispatch();

  const likedIds = useSelector((state) => state.likes.ids);

  // Which lectures this user has liked is not part of the media payload, so it
  // is fetched once per mount. The slice is shared with the likes page, which
  // loads the same ids as a side effect of loading its cards.
  useEffect(() => { dispatch(fetchLikedIds()); }, [dispatch]);

  // The ids in the slice are numbers. A caller holding a route param or a note's
  // media_id may have a string, and `[7].includes("7")` is false — a mismatch
  // that shows up as a like button that never lights.
  const id = Number(mediaId) || null;
  const isLiked = id ? likedIds.includes(id) : false;

  const toggleLike = useCallback(() => {
    if (!id) return;
    dispatch(isLiked ? unlikeMedia(id) : likeMedia(id));
  }, [dispatch, isLiked, id]);

  return { isLiked, toggleLike };
};

export default useMediaLike;
