import { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "../../../store/selectors/authSelectors";
import { uploadAvatar } from "../../../store/slicesAndThunks/authSlice/authPost";
import { removeAvatar } from "../../../store/slicesAndThunks/authSlice/authDelete";
import { notify } from "../../../store/slicesAndThunks/snackbarSlice";
import { prepareAvatar } from "../../../utilities/avatarImage";
import i18n from "../../../i18n/i18n";

// What the profile picture control does — choosing a picture, shrinking it,
// sending it, removing it — for the two places it appears: the account page
// and the picture offered right after signing up (WelcomeAvatarDialog).
//
// The server's answer is a toast (toasts:avatar/*, notificationMiddleware);
// only a file this browser cannot draw is said here, before anything is sent.
export const useAvatarEditor = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const choose = () => inputRef.current?.click();

  const onFileChosen = async (event) => {
    const file = event.target.files?.[0];
    // Cleared at once, so choosing the same file again still fires a change.
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      let image;
      try {
        image = await prepareAvatar(file);
      } catch {
        dispatch(notify({ message: i18n.t("profile:avatar.notImage"), severity: "error" }));
        return;
      }
      await dispatch(uploadAvatar(image));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await dispatch(removeAvatar());
    } finally {
      setBusy(false);
    }
  };

  return {
    user,
    hasPicture: Boolean(user?.avatar_url),
    busy,
    inputRef,
    choose,
    onFileChosen,
    remove,
  };
};
