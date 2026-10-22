import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "../../../store/selectors/authSelectors";
import { updateProfile } from "../../../store/slicesAndThunks/authSlices/authPut";
import { changePassword } from "../../../store/slicesAndThunks/authSlices/authPost";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { hebrewForError } from "../../../utilities/apiError";

// What the profile page does — the profile edit and the password change, and
// the checks on both — so ProfilePage.jsx is layout only (the
// useXxxPageController rule: whatever dispatches or selects lives here).
export const MIN_PASSWORD_LENGTH = 8; // mirrors MIN_PASSWORD_LENGTH in servicesAuth.js

export const useProfilePageController = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

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
        ? { message: "הפרטים נשמרו", severity: "success" }
        : { message: hebrewForError(result.payload, "שמירת הפרטים נכשלה"), severity: "error" }
    ));
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
      dispatch(notify({ message: "הסיסמה שונתה", severity: "success" }));
      return;
    }
    // Shown inline rather than as a toast: it is almost always "the current
    // password is wrong", which is about the field directly above it.
    setPasswordError(hebrewForError(result.payload, "שינוי הסיסמה נכשל"));
  };

  return {
    confirm,
    currentPassword,
    displayName,
    handleChangePassword,
    handleSaveProfile,
    nameChanged,
    newPassword,
    passwordError,
    passwordMismatch,
    passwordTooShort,
    savingPassword,
    savingProfile,
    setConfirm,
    setCurrentPassword,
    setDisplayName,
    setNewPassword,
    user,
  };
};
