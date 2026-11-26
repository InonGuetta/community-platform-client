import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectContinueWatching } from "../../../store/selectors/mediaSelectors";
import { fetchContinueWatching } from "../../../store/slicesAndThunks/mediaSlice/mediaGet";
import { statuses } from "../../../utilities/constant";
import { featuredItem, heroItem } from "./featuredItem";

// The banner's item. "המשך צפייה" is read from the store slice the shelf page
// uses and fetched only when nothing has asked for it yet — one request, not
// one per render. A failed fetch settles to the newest-lesson fallback.
export const useArchiveHero = ({ active, items, hasActiveFilter, sortOrder }) => {
  const dispatch = useDispatch();
  const shelf = useSelector(selectContinueWatching);
  useEffect(() => {
    if (active && shelf.status === statuses.idle) dispatch(fetchContinueWatching());
  }, [active, shelf.status, dispatch]);
  if (!active) return null;
  const featured = featuredItem(items, { hasActiveFilter, sortOrder });
  const settled = shelf.status === statuses.succeeded || shelf.status === statuses.failed;
  return heroItem(shelf.items, featured, { settled });
};
