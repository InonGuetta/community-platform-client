import { useSelector } from "react-redux";
import { selectUser } from "../../../store/selectors/authSelectors";
import { isPrivileged } from "../../../utilities/permissions";
import { selectUiState } from "../../../store/selectors/uiSelectors";
import { useAdminView } from "../../layout/useAdminView";

// The archive page's own upload: who is looking, whether they may upload, and
// whether the upload dialog is open. Its own hook rather than more of
// useArchivePageController, which the lecturer's page shares and which has no
// upload of its own.
//
// The button (and the empty archive's call to upload) is admin-only in the
// mockups: hidden while "תצוגת מנהל" is off (D-07). The dialog itself still
// opens when asked — from the avatar menu's "העלאת מדיה", which is shown only
// while the switch is on anyway.
export const useArchiveUpload = () => {
  const { isUploadOpen } = useSelector(selectUiState);
  const user = useSelector(selectUser);
  const { showAdmin } = useAdminView();
  const canUpload = isPrivileged(user) && showAdmin;
  return { user, isUploadOpen, canUpload };
};
