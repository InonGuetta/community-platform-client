import { createSelector } from "@reduxjs/toolkit";

const selectAuthState = (state) => state.auth;

export const selectUser = createSelector(selectAuthState, (auth) => auth.user);
export const selectAuthStatus = createSelector(selectAuthState, (auth) => auth.status);
export const selectLoginStatus = createSelector(selectAuthState, (auth) => auth.loginStatus);
export const selectAuthError = createSelector(selectAuthState, (auth) => auth.error);
export const selectIsAuthenticated = createSelector(selectAuthState, (auth) => !!auth.user);
export const selectUserRole = createSelector(selectAuthState, (auth) => auth.user?.role ?? null);
export const selectAuthInitialized = createSelector(selectAuthState, (auth) => auth.initialized);
// A profile picture is on offer to an account just created here.
export const selectAvatarOffer = createSelector(selectAuthState, (auth) => auth.offerAvatar);
// The server could not be reached to ask who is signed in (PRD MOB-2).
export const selectAuthUnreachable = createSelector(selectAuthState, (auth) => auth.unreachable);
