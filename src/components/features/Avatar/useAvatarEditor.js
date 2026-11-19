import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "../../../store/selectors/authSelectors";
import { uploadAvatar } from "../../../store/slicesAndThunks/authSlice/authPost";
import { removeAvatar } from "../../../store/slicesAndThunks/authSlice/authDelete";
import { notify } from "../../../store/slicesAndThunks/snackbarSlice";
import { decodePicture, renderAvatar } from "../../../utilities/avatarImage";
import { cameraSupported } from "./useCamera";
import i18n from "../../../i18n/i18n";

// What the profile picture control does, for the account page and the picture
// offered right after signing up (WelcomeAvatarDialog):
//
//   a file from the device ─┐
//   a photo taken now ──────┴→ the crop editor → the framed square → upload
//
// "Take a photo" opens the camera in the page (CameraDialog) where the browser
// offers one; where it does not, the device's own camera through the file
// input (`capture`). The server's answer is a toast (toasts:avatar/*); only a
// file this browser cannot draw is said here, before anything is sent.
export const useAvatarEditor = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const fileRef = useRef(null);
  const captureRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  // The decoded picture being framed, or null when the crop editor is closed.
  const [picture, setPicture] = useState(null);

  // A picture still open when the control goes away is freed.
  const pictureRef = useRef(null);
  useEffect(() => {
    pictureRef.current = picture;
  }, [picture]);
  useEffect(() => () => pictureRef.current?.release(), []);

  const frame = async (blob) => {
    try {
      setPicture(await decodePicture(blob));
    } catch {
      dispatch(notify({ message: i18n.t("profile:avatar.notImage"), severity: "error" }));
    }
  };

  const onFileChosen = async (event) => {
    const file = event.target.files?.[0];
    // Cleared at once, so choosing the same file again still fires a change.
    event.target.value = "";
    if (file) await frame(file);
  };

  const closeCrop = () => {
    picture?.release();
    setPicture(null);
  };

  const saveCrop = async (rect) => {
    if (!picture) return;
    setBusy(true);
    try {
      const image = await renderAvatar(picture.bitmap, rect);
      const result = await dispatch(uploadAvatar(image));
      // On a failure the toast says why, and the framing stays for another try.
      if (result.meta.requestStatus === "fulfilled") closeCrop();
    } catch {
      dispatch(notify({ message: i18n.t("profile:avatar.notImage"), severity: "error" }));
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

  const chooseFile = () => {
    setCameraOpen(false);
    fileRef.current?.click();
  };

  const takePhoto = () => {
    if (cameraSupported()) setCameraOpen(true);
    else captureRef.current?.click();
  };

  const onCaptured = async (blob) => {
    setCameraOpen(false);
    await frame(blob);
  };

  return {
    user,
    hasPicture: Boolean(user?.avatar_url),
    busy,
    fileRef,
    captureRef,
    chooseFile,
    takePhoto,
    onFileChosen,
    remove,
    camera: { open: cameraOpen, close: () => setCameraOpen(false), onCaptured },
    crop: { picture, close: closeCrop, save: saveCrop },
  };
};
