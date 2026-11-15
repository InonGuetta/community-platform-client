import { createApiThunk } from "../../createApiThunk";
import { authApi } from "../../../api/authApi";

// The user editing their own row — the only write they make to it.
//
// Its own file rather than joining authPost, following the one-file-per-HTTP-verb
// convention the store uses everywhere else. PATCH rather than PUT because the
// body describes a change to two fields, not a replacement of the account.
export const updateProfile = createApiThunk("auth/updateProfile", "Could not save your profile", async (payload) => {
  return await authApi.updateProfile(payload);
});

// The interface language, saved to the account (users.locale) so the mail the
// server writes and the next device both use it.
export const saveLocale = createApiThunk("auth/saveLocale", "Could not save the language", async (locale) => {
  return await authApi.setLocale(locale);
});
