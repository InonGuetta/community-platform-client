import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clearError } from "../../../store/slicesAndThunks/authSlices/authSlice";
import { selectLoginStatus, selectAuthError } from "../../../store/selectors/authSelectors";
import { statuses } from "../../../utilities/constant";
import { takeReturnTo } from "../../../utilities/returnTo";

// Signing in and signing up end the same way, so they share this: an error
// left from an earlier attempt is cleared on arrival, the form goes to the
// server through `action` (login or register), and a success returns to where
// the user was going before they were asked to sign in.
/**
 * @param {(form: any) => any} action  the thunk the form is sent with
 */
export const useAuthSubmit = (action) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loginStatus = useSelector(selectLoginStatus);
  const error = useSelector(selectAuthError);

  useEffect(() => { dispatch(clearError()); }, [dispatch]);

  const submit = async (form) => {
    const result = await dispatch(action(form));
    if (result.meta.requestStatus === "fulfilled") navigate(takeReturnTo());
  };

  const isSubmitting = loginStatus === statuses.loading;

  return { error, isSubmitting, submit };
};
