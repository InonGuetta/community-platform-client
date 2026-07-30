import { createSelector } from "@reduxjs/toolkit";

const selectBookmarksState = (state) => state.bookmarks;

export const selectAllBookmarks = createSelector(selectBookmarksState, (b) => b.items);
export const selectBookmarksStatus = createSelector(selectBookmarksState, (b) => b.status);

// Sorted here rather than relying on the order the API returned. The list is
// fetched sorted, but createBookmark appends the new one, so a bookmark added
// at an earlier point than the last one left the array out of order — and
// NotesPanel walks it assuming ascending time and stops at the first entry past
// the playhead, so it would highlight the wrong bookmark. filter() already
// copies, so sorting it does not touch the stored array.
export const selectBookmarksByMediaId = (mediaId) =>
  createSelector(selectAllBookmarks, (items) =>
    items
      .filter((b) => b.media_id === Number(mediaId))
      .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
  );
