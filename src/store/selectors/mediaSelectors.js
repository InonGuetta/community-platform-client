import { createSelector } from "@reduxjs/toolkit";

const selectMediaState = (state) => state.media;

export const selectAllMedia = createSelector(selectMediaState, (media) => media.items);
export const selectSelectedMedia = createSelector(selectMediaState, (media) => media.selectedItem);
export const selectMediaStatus = createSelector(selectMediaState, (media) => media.status);
export const selectMediaError = createSelector(selectMediaState, (media) => media.error);

export const selectMediaByType = (type) =>
  createSelector(selectAllMedia, (items) => items.filter((item) => item.media_type === type));
