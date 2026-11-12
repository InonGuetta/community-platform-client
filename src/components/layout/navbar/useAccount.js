import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../../store/slicesAndThunks/authSlice/authPost";
import { clearOfflineLessons } from "../../../store/slicesAndThunks/offlineSlice/offlineDelete";
import { selectUser, selectUserRole } from "../../../store/selectors/authSelectors";

// The signed-in account, as the bar and the banner under it need it: who it is,
// which role it holds, and signing out.
export const useAccount = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const role = useSelector(selectUserRole);

  // Lessons saved for listening offline go with the person who saved them —
  // the next one to use this device must not find them (PRD MOB-2).
  const signOut = async () => {
    await dispatch(clearOfflineLessons());
    await dispatch(logout());
  };

  return { user, role, signOut };
};

// The letter the bar's avatars show when there is no picture.
export const avatarInitial = (user) => user?.display_name?.[0]?.toUpperCase() || "U";
