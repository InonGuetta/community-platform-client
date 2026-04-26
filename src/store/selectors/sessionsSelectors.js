import { createSelector } from "@reduxjs/toolkit";

const selectSessionsState = (state) => state.sessions;

export const selectAllRooms = createSelector(selectSessionsState, (s) => s.rooms);
export const selectActiveRoom = createSelector(selectSessionsState, (s) => s.activeRoom);
export const selectSessionsStatus = createSelector(selectSessionsState, (s) => s.status);
export const selectSessionsError = createSelector(selectSessionsState, (s) => s.error);
