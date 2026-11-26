import { DEFAULT_SORT } from "./componentsArchive/sortOptions";

// The lesson in the archive's banner (decision 1; D-01): the newest published
// item — taken from the list already loaded, with no request of its own.
//
// Only when the list IS the newest-first archive: no search, no filter, no
// type chosen, and the default order. Under any other order the first item is
// not "the latest", and the banner would be saying something untrue. A draft
// is never featured, not even to its manager.
export const featuredItem = (items, { hasActiveFilter = false, sortOrder = DEFAULT_SORT } = {}) => {
  if (hasActiveFilter || sortOrder !== DEFAULT_SORT) return null;
  return (items || []).find((item) => item.is_published) || null;
};

// What the banner shows (owner's change, polish run): the item the reader
// consumed most recently — the first of "המשך צפייה" — and only when there is
// none, today's newest published lesson. `gate` is featuredItem's own answer:
// when it says there is no banner (a search, a filter, another order), neither
// does this. `settled` is false while the shelf is still loading, so the banner
// does not flash the newest lesson and then swap it.
export const heroItem = (continueItems, featured, { settled = true } = {}) => {
  if (!featured) return null;
  if (!settled) return null;
  const resume = (continueItems || [])[0];
  return resume ? { item: resume, resuming: true } : { item: featured, resuming: false };
};
