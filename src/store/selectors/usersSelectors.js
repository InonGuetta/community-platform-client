import { createSelector } from "@reduxjs/toolkit";

const selectUsersState = (state) => state.users;

export const selectAllUsers = createSelector(selectUsersState, (u) => u.items);
export const selectSelectedUser = createSelector(selectUsersState, (u) => u.selectedUser);
export const selectUsersStatus = createSelector(selectUsersState, (u) => u.status);
export const selectUsersError = createSelector(selectUsersState, (u) => u.error);
export const selectActiveUsers = createSelector(selectAllUsers, (items) => items.filter((u) => u.is_active));
