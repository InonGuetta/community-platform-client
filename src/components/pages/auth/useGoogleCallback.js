import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchMe } from "../../../store/slicesAndThunks/authSlices/authGet";
import { takeReturnTo } from "../../../utilities/returnTo";

// What the return from Google does: Google's refusal goes back to sign-in;
// otherwise the session the server set is confirmed, and the user goes on to
// where they were going. GoogleCallback.jsx shows a spinner meanwhile.

export const useGoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      navigate("/sign-in?error=google_failed");
      return;
    }
    // Cookie has been set server-side via the redirect; hydrate the user.
    dispatch(fetchMe()).then((result) => {
      if (result.meta.requestStatus === "fulfilled") navigate(takeReturnTo());
      else navigate("/sign-in?error=google_failed");
    });
    // Runs exactly once, on arrival back from Google. Adding the dependencies
    // the rule asks for would let a second fetchMe fire — and this component
    // navigates away as its whole purpose, so re-running it is never wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
