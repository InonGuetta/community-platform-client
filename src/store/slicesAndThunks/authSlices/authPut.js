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
