import { createApiThunk } from "../../createApiThunk";
import { authApi } from "../../../api/authApi";
import { changeLanguage, markGuestChoice } from "../../../i18n/i18n";
import { selectUser } from "../../selectors/authSelectors";

// The user editing their own row — the only write they make to it.
//
// Its own file rather than joining authPost, following the one-file-per-HTTP-verb
// convention the store uses everywhere else. PATCH rather than PUT because the
// body describes a change to two fields, not a replacement of the account.
export const updateProfile = createApiThunk("auth/updateProfile", "Could not save your profile", async (payload) => {
  return await authApi.updateProfile(payload);
});

// ── The interface language ──────────────────────────────────────────────────
//
// Typed language/*, not auth/*: the notification middleware keeps auth/*
// failures to the forms' own alerts, and these two have no form — a failure
// must reach the person as a toast (ERROR_MESSAGES in notificationMiddleware).

// Saved to the account (users.locale), so the mail the server writes and the
// next device both use it. The slice takes the language from the REQUEST, as
// soon as it is sent, so answers arriving out of order cannot put an older
// choice back.
export const saveLocale = createApiThunk("language/save", "Could not save the language", async (locale) => {
  return await authApi.setLocale(locale);
});

// What every language switcher does: the interface switches (fetching the
// language's strings first, which can fail offline), and then a signed-in
// account saves it — or, signed out, it is marked as a guest's choice for the
// next sign-in in this tab to save (see takeGuestChoice).
export const chooseLanguage = createApiThunk(
  "language/choose",
  "Could not switch the language",
  async (code, { dispatch, getState }) => {
    await changeLanguage(code);
    if (selectUser(getState())) await dispatch(saveLocale(code));
    else markGuestChoice(code);
  }
);
