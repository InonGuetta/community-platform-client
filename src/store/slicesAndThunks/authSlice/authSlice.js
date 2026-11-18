import { createSlice } from "@reduxjs/toolkit";
import { login, register, logout, resetPassword, requestRole, uploadAvatar, startPhoneVerification, verifyPhone } from "./authPost";
import { updateProfile, saveLocale } from "./authPut";
import { removeAvatar, removePhone } from "./authDelete";
import { fetchMe } from "./authGet";
import { statuses } from "../../../utilities/constant";
import { ERROR_CODES } from "../../../utilities/apiError";

// The account's phone, as the server sends it (services/servicesPhone.js →
// phoneStateOf).
const PHONE_FIELDS = ["phone", "phone_verified_at", "phone_pending", "phone_pending_expires_at"];
const phoneFieldsOf = (source) =>
  Object.fromEntries(PHONE_FIELDS.filter((key) => source && key in source).map((key) => [key, source[key]]));
const mergePhone = (state, action) => {
  if (state.user) Object.assign(state.user, phoneFieldsOf(action.payload));
};

// "Who am I" failed because nothing answered — no network, or the API is down —
// rather than because the server said no. The app cannot tell whether this
// person is signed in, so it sends them to the lessons saved on the device
// instead of to a sign-in form that cannot work either (PRD MOB-2).
const UNREACHABLE_CODES = new Set([ERROR_CODES.NETWORK_UNREACHABLE, ERROR_CODES.API_UNAVAILABLE]);

const initialState = {
  user: null,
  status: statuses.idle,
  loginStatus: statuses.idle,
  // The WHOLE rejection — { message, code } — not just the message, unlike every
  // other slice. Auth is the only one whose error is rendered to the user
  // (inline, by SignIn/SignUp, rather than as a toast), and the Hebrew for it is
  // keyed on the code. Storing only the message is what left "Invalid
  // credentials" on screen in a right-to-left Hebrew application.
  error: null,
  initialized: false,
  // True when the last "who am I" could not reach the server. See above.
  unreachable: false,
  // Tracks the in-flight fetchMe request id; cleared whenever a login/register/logout
  // happens so a stale fetchMe response can't overwrite the freshly-set user.
  activeFetchMeRequestId: null,
  // An account was just created here: offer it a profile picture once
  // (features/Avatar/WelcomeAvatarDialog). Not kept across a reload — an offer,
  // not a step that must be finished.
  offerAvatar: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    authInitialized(state) {
      state.initialized = true;
    },
    clearError(state) {
      state.error = null;
    },
    avatarOfferDismissed(state) {
      state.offerAvatar = false;
    },
    // The cookie expired or was rejected mid-session. Deliberately a plain
    // reducer and not the logout thunk: that thunk POSTs to /auth/logout, which
    // would itself answer 401 and trigger this again.
    //
    // activeFetchMeRequestId is cleared for the same reason login/logout clear
    // it — otherwise a fetchMe that was already in flight could land afterwards
    // and put the user back.
    sessionExpired(state) {
      state.user = null;
      state.status = statuses.idle;
      state.loginStatus = statuses.idle;
      state.error = null;
      state.initialized = true;
      state.activeFetchMeRequestId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loginStatus = statuses.loading;
        state.error = null;
        state.activeFetchMeRequestId = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loginStatus = statuses.succeeded;
        state.status = statuses.succeeded;
        state.user = action.payload.user;
        state.initialized = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loginStatus = statuses.failed;
        state.error = action.payload;
      })

      .addCase(register.pending, (state) => {
        state.loginStatus = statuses.loading;
        state.error = null;
        state.activeFetchMeRequestId = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loginStatus = statuses.succeeded;
        state.status = statuses.succeeded;
        state.user = action.payload.user;
        state.initialized = true;
        state.offerAvatar = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.loginStatus = statuses.failed;
        state.error = action.payload;
      })

      // A completed reset IS a login — the server mints the cookie with it — so
      // it lands here the same way, and the user arrives signed in rather than
      // back at a form asking for the password they chose four seconds ago.
      .addCase(resetPassword.pending, (state) => {
        state.loginStatus = statuses.loading;
        state.error = null;
        state.activeFetchMeRequestId = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loginStatus = statuses.succeeded;
        state.status = statuses.succeeded;
        state.user = action.payload.user;
        state.initialized = true;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loginStatus = statuses.failed;
        state.error = action.payload;
      })

      // The saved row comes back complete, so it replaces the held one rather
      // than being merged into it — a merge would keep whatever the server just
      // decided not to change. Except the phone (migration 054): the PATCH does
      // not read it, so the held phone fields are carried over.
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = { ...action.payload, ...phoneFieldsOf(state.user) };
      })

      // The language is taken from the REQUEST, the moment it is sent — not
      // from the answer: two quick choices can be answered out of order, and
      // the later answer would otherwise put the earlier language back (and
      // the sync in useAccountLanguage would then adopt it). Only the language
      // changes; the row PATCH returns lacks the role-request fields. A failed
      // save is a toast (language/save); the next "who am I" brings the
      // account's real value back.
      .addCase(saveLocale.pending, (state, action) => {
        if (state.user) state.user.locale = action.meta.arg;
      })

      .addCase(fetchMe.pending, (state, action) => {
        state.status = statuses.loading;
        state.activeFetchMeRequestId = action.meta.requestId;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        if (state.activeFetchMeRequestId !== action.meta.requestId) return;
        state.status = statuses.succeeded;
        state.user = action.payload;
        state.initialized = true;
        state.unreachable = false;
        state.activeFetchMeRequestId = null;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        // Only apply the rejection if no login/register/logout has invalidated us.
        if (state.activeFetchMeRequestId !== action.meta.requestId) {
          state.initialized = true;
          return;
        }
        state.status = statuses.failed;
        state.user = null;
        state.initialized = true;
        state.unreachable = UNREACHABLE_CODES.has(action.payload?.code);
        state.activeFetchMeRequestId = null;
      })

      .addCase(logout.pending, (state) => {
        state.activeFetchMeRequestId = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.offerAvatar = false;
        state.user = null;
        state.status = statuses.idle;
        state.loginStatus = statuses.idle;
        state.error = null;
        state.initialized = true;
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.status = statuses.idle;
        state.loginStatus = statuses.idle;
        state.initialized = true;
      })

      // Only the picture changes: the row the avatar routes answer with lacks
      // the role-request fields the banner reads, as updateProfile's does.
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        if (state.user) state.user.avatar_url = action.payload.avatar_url;
      })
      .addCase(removeAvatar.fulfilled, (state) => {
        if (state.user) state.user.avatar_url = null;
      })

      // The phone routes answer with the phone fields alone (phone,
      // phone_verified_at, phone_pending, phone_pending_expires_at): merged.
      .addCase(startPhoneVerification.fulfilled, mergePhone)
      .addCase(verifyPhone.fulfilled, mergePhone)
      .addCase(removePhone.fulfilled, mergePhone)

      // MERGED into the stored user, not assigned over it: the endpoint answers
      // with the columns it touched, and replacing would drop avatar_url and
      // created_at from the profile screen the moment somebody applies.
      .addCase(requestRole.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
      })
      .addCase(requestRole.rejected, (state, action) => {
        state.error = action.payload?.message;
      });
  },
});

export const { authInitialized, clearError, sessionExpired, avatarOfferDismissed } = authSlice.actions;
export default authSlice.reducer;
