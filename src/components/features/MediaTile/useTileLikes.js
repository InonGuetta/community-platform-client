import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchLikedIds } from "../../../store/slicesAndThunks/likesSlice/likesGet";
import { likeMedia } from "../../../store/slicesAndThunks/likesSlice/likesPost";
import { unlikeMedia } from "../../../store/slicesAndThunks/likesSlice/likesDelete";
import { selectLikedIds } from "../../../store/selectors/likesSelectors";
import { selectUser } from "../../../store/selectors/authSelectors";

// The heart on every tile of a grid (D-18): the same likes slice and the same
// thunks as the lesson page's like button (pages/mediaView/useMediaLike.js),
// so a like given in either place shows in both — optimistic, as that slice
// already is.
//
// Once per GRID, not once per tile: useMediaLike fetches the liked ids on
// every mount, which on a page of 24 tiles would be 24 identical requests.
// Only for somebody signed in — a like belongs to an account.
export const useTileLikes = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const likedIds = useSelector(selectLikedIds);
  const userId = user?.id;

  useEffect(() => {
    if (userId) dispatch(fetchLikedIds());
  }, [dispatch, userId]);

  // The slice holds numbers; an id that came through a route may be a string.
  const liked = useMemo(() => new Set(likedIds.map(Number)), [likedIds]);
  const isLiked = useCallback((id) => liked.has(Number(id)), [liked]);
  const toggleLike = useCallback(
    (id) => {
      const n = Number(id);
      if (!n) return;
      dispatch(liked.has(n) ? unlikeMedia(n) : likeMedia(n));
    },
    [dispatch, liked]
  );

  return { enabled: Boolean(userId), isLiked, toggleLike };
};

export default useTileLikes;
