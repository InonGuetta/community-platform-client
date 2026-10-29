import { createSelector } from "@reduxjs/toolkit";
import { emptyLesson } from "../slicesAndThunks/discussionSlice/discussionSlice";

const selectDiscussionState = (state) => state.discussion;

// One stable empty value, so a lesson nobody has opened yet does not hand every
// render a fresh object and re-render everything that selects it.
const EMPTY = emptyLesson();

export const selectDiscussionByMediaId = (mediaId) =>
  createSelector(selectDiscussionState, (d) => d.byMediaId[mediaId] ?? EMPTY);

// Today's question quota — the reader's, across every lesson. null when unknown
// or when the reader's role is not counted.
export const selectDiscussionQuota = (state) => state.discussion.quota ?? null;
