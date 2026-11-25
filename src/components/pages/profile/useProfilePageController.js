import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "../../../store/selectors/authSelectors";
import { updateProfile } from "../../../store/slicesAndThunks/authSlice/authPut";
import { changePassword } from "../../../store/slicesAndThunks/authSlice/authPost";
import { fetchMe } from "../../../store/slicesAndThunks/authSlice/authGet";
import { authApi } from "../../../api/authApi";
import { notify } from "../../../store/slicesAndThunks/snackbarSlice";
import { messageForError } from "../../../utilities/apiError";
import { useTranslation } from "react-i18next";

// What the profile page does — the profile edit and the password change, and
// the checks on both — so ProfilePage.jsx is layout only (the
// useXxxPageController rule: whatever dispatches or selects lives here).
export const MIN_PASSWORD_LENGTH = 8; // mirrors MIN_PASSWORD_LENGTH in servicesAuth.js

export const useProfilePageController = () => {
  const { t } = useTranslation("profile");
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  // Seeded from the store rather than held as the store's own value: the field
  // is the user's draft while they type, and it should not be rewritten
  // underneath them by an unrelated refetch.
  useEffect(() => {
    setDisplayName(user?.display_name ?? "");
  }, [user?.display_name]);

  // Not signed in (yet): nothing below applies, and the page renders nothing.
  if (!user) return { user: null };

  const nameChanged = displayName.trim() !== (user.display_name ?? "") && displayName.trim().length > 0;

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    const result = await dispatch(updateProfile({ displayName: displayName.trim() }));
    setSavingProfile(false);
    dispatch(notify(
      result.meta.requestStatus === "fulfilled"
        ? { message: t("details.saved"), severity: "success" }
        : { message: messageForError(result.payload, t("details.failed")), severity: "error" }
    ));
  };

  // The verification link again (UI_UX_FIXES 3.12 / stage 5). Called on
  // src/api directly: nothing else reads the answer, it is a toast. Already
  // verified (in another tab, say) → the account is read again so the badge
  // catches up.
  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      const { sent, alreadyVerified } = await authApi.resendVerification();
      if (alreadyVerified) {
        dispatch(fetchMe());
        dispatch(notify({ message: t("verification.alreadyVerified"), severity: "info" }));
      } else if (sent) {
        dispatch(notify({ message: t("verification.sent"), severity: "success" }));
      } else {
        dispatch(notify({ message: t("verification.failed"), severity: "error" }));
      }
    } catch (err) {
      dispatch(notify({ message: messageForError(err, t("verification.failed")), severity: "error" }));
    } finally {
      setResendingVerification(false);
    }
  };

  const passwordMismatch = confirm.length > 0 && newPassword !== confirm;
  const passwordTooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError(null);
    setSavingPassword(true);
    const result = await dispatch(changePassword({ currentPassword, newPassword }));
    setSavingPassword(false);

    if (result.meta.requestStatus === "fulfilled") {
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      dispatch(notify({ message: t("password.changed"), severity: "success" }));
      return;
    }
    // Shown inline rather than as a toast: it is almost always "the current
    // password is wrong", which is about the field directly above it.
    setPasswordError(messageForError(result.payload, t("password.failed")));
  };

  return {
    confirm,
    currentPassword,
    displayName,
    handleChangePassword,
    handleResendVerification,
    handleSaveProfile,
    nameChanged,
    newPassword,
    passwordError,
    passwordMismatch,
    passwordTooShort,
    resendingVerification,
    savingPassword,
    savingProfile,
    setConfirm,
    setCurrentPassword,
    setDisplayName,
    setNewPassword,
    user,
  };
};
