import { createSelector } from "@reduxjs/toolkit";
import { inReadingOrder } from "../../utilities/bookmarks";

const selectBookmarksState = (state) => state.bookmarks;

export const selectAllBookmarks = createSelector(selectBookmarksState, (b) => b.items);
export const selectBookmarksStatus = createSelector(selectBookmarksState, (b) => b.status);

// Sorted here rather than relying on the order the API returned. The list is
// fetched sorted, but createBookmark appends the new one, so a bookmark added
// at an earlier point than the last one left the array out of order — and
// NotesPanel walks it assuming ascending time and stops at the first entry past
// the playhead, so it would highlight the wrong bookmark.
//
// The comparator was `a.timestamp_seconds - b.timestamp_seconds`, which is NaN
// for a bookmark in a book — every one of them has a NULL timestamp — and a
// comparator returning NaN leaves the order unspecified. A sefer's bookmarks
// therefore came back in no order at all, here and in two places in the
// notebook. inReadingOrder compares each kind in its own coordinate space and is
// the single answer all three now use.
export const selectBookmarksByMediaId = (mediaId) =>
  createSelector(selectAllBookmarks, (items) =>
    inReadingOrder(items.filter((b) => b.media_id === Number(mediaId)))
  );
