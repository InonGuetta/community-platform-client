import { createSelector } from "@reduxjs/toolkit";

const selectMediaState = (state) => state.media;

export const selectAllMedia = createSelector(selectMediaState, (media) => media.items);
export const selectSelectedMedia = createSelector(selectMediaState, (media) => media.selectedItem);
export const selectMediaStatus = createSelector(selectMediaState, (media) => media.status);
export const selectMediaError = createSelector(selectMediaState, (media) => media.error);

export const selectMediaByType = (type) =>
  createSelector(selectAllMedia, (items) => items.filter((item) => item.media_type === type));

// selectKnownCreators lived here and is gone. It derived the creator list from
// the media in the store, which stopped being the whole library the moment the
// archive began filtering server-side — the menu would have narrowed to whatever
// was already chosen. The list now comes from GET /media/creators, which asks
// the question of the library rather than of the page.
