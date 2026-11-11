import { useSelector } from "react-redux";
import { selectUser } from "../../../store/selectors/authSelectors";
import { isPrivileged } from "../../../utilities/permissions";

// The archive page's own upload: who is looking, whether they may upload, and
// whether the upload dialog is open. Its own hook rather than more of
// useArchivePageController, which the lecturer's page shares and which has no
// upload of its own.
export const useArchiveUpload = () => {
  const { isUploadOpen } = useSelector((state) => state.ui);
  const user = useSelector(selectUser);
  const canUpload = isPrivileged(user);
  return { user, isUploadOpen, canUpload };
};
