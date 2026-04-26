import { createSelector } from "@reduxjs/toolkit";

const selectAuthState = (state) => state.auth;

export const selectUser = createSelector(selectAuthState, (auth) => auth.user);
export const selectToken = createSelector(selectAuthState, (auth) => auth.token);
export const selectAuthStatus = createSelector(selectAuthState, (auth) => auth.status);
export const selectAuthError = createSelector(selectAuthState, (auth) => auth.error);
export const selectIsAuthenticated = createSelector(selectAuthState, (auth) => !!auth.user);
export const selectUserRole = createSelector(selectAuthState, (auth) => auth.user?.role ?? null);
