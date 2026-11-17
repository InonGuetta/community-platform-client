import { createApiThunk } from "../../createApiThunk";
import { authApi } from "../../../api/authApi";

// Removing one's own profile picture (migration 052). Typed avatar/*, not
// auth/*: the notification middleware keeps auth/* failures to the sign-in
// forms, and this has no form — its outcome is a toast.
export const removeAvatar = createApiThunk("avatar/remove", "Could not remove the picture", async () => {
  return await authApi.removeAvatar();
});
