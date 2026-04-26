import { createSelector } from "@reduxjs/toolkit";

const selectBookmarksState = (state) => state.bookmarks;

export const selectAllBookmarks = createSelector(selectBookmarksState, (b) => b.items);
export const selectBookmarksStatus = createSelector(selectBookmarksState, (b) => b.status);

export const selectBookmarksByMediaId = (mediaId) =>
  createSelector(selectAllBookmarks, (items) => items.filter((b) => b.media_id === Number(mediaId)));
