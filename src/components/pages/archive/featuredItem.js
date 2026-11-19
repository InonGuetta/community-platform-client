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
