import { createApiThunk } from "../../createApiThunk";
import { authApi } from "../../../api/authApi";

// Removing one's own profile picture (migration 052). Typed avatar/*, not
// auth/*: the notification middleware keeps auth/* failures to the sign-in
// forms, and this has no form — its outcome is a toast.
export const removeAvatar = createApiThunk("avatar/remove", "Could not remove the picture", async () => {
  return await authApi.removeAvatar();
});

// Removing one's own mobile number (migration 054) — and with it every SMS choice.
export const removePhone = createApiThunk("phone/remove", "Could not remove the phone number", async () => {
  return await authApi.removePhone();
});
