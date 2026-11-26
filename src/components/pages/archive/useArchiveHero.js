import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectHistory } from "../../../store/selectors/mediaSelectors";
import { fetchHistory } from "../../../store/slicesAndThunks/mediaSlice/mediaGet";
import { playInBar } from "../../../store/slicesAndThunks/nowPlayingSlice/nowPlayingSlice";
import { statuses } from "../../../utilities/constant";
import { featuredItem, heroItem } from "./featuredItem";

// The banner's item: the last lesson the reader was really in, of any kind —
// the first of the history (the "היסטוריה" shelf's slice), not of "המשך צפייה",
// which knows only what played. Fetched only when nothing has asked for it yet
// — one request, not one per render — or when a lesson page was opened or the
// bottom player saved a position since (`stale`). A failed fetch settles to the
// newest-lesson fallback.
//
// `play` puts a recording or a video in the bottom player (D-145) — the
// banner's play button; its details button still opens the lesson's page.
export const useArchiveHero = ({ active, items, hasActiveFilter, sortOrder }) => {
  const dispatch = useDispatch();
  const shelf = useSelector(selectHistory);
  useEffect(() => {
    if (active && (shelf.status === statuses.idle || shelf.stale)) dispatch(fetchHistory());
  }, [active, shelf.status, shelf.stale, dispatch]);
  const play = useCallback((item) => dispatch(playInBar(item)), [dispatch]);
  if (!active) return null;
  const featured = featuredItem(items, { hasActiveFilter, sortOrder });
  const settled = shelf.status === statuses.succeeded || shelf.status === statuses.failed;
  const chosen = heroItem(shelf.items, featured, { settled });
  return chosen ? { ...chosen, play } : null;
};
