import { useDispatch, useSelector } from "react-redux";
import { selectAvatarOffer, selectUser } from "../../../store/selectors/authSelectors";
import { avatarOfferDismissed } from "../../../store/slicesAndThunks/authSlice/authSlice";

// The picture offered once, right after an account is created here (the
// register thunk sets the offer). Closing it in any way withdraws it; the
// account page offers the same control at any time after.
export const useWelcomeAvatar = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const offered = useSelector(selectAvatarOffer);

  return {
    open: Boolean(offered && user),
    name: user?.display_name?.trim() || "",
    hasPicture: Boolean(user?.avatar_url),
    close: () => dispatch(avatarOfferDismissed()),
  };
};
