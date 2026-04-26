import { createSelector } from "@reduxjs/toolkit";

const selectTranscriptState = (state) => state.transcript;

export const selectTranscriptByMediaId = (mediaId) =>
  createSelector(selectTranscriptState, (t) => t.byMediaId[mediaId] ?? null);

export const selectTranscriptStatus = createSelector(selectTranscriptState, (t) => t.status);
export const selectSearchResults = createSelector(selectTranscriptState, (t) => t.searchResults);
