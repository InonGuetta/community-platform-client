import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { verifyEmail } from "../../../store/slicesAndThunks/authSlice/authPost";
import { messageForError } from "../../../utilities/apiError";
import i18n from "../../../i18n/i18n";

// What the verification link does: spends its single-use token once, and
// says how that went. VerifyEmail.jsx shows the answer.

export const useVerifyEmail = () => {
  const dispatch = useDispatch();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState({ status: "pending", message: null });

  // React 18's StrictMode mounts effects twice in development, and this one
  // SPENDS a single-use token: without the guard the second run consumes the
  // token the first just burned and reports the link as invalid, on a
  // verification that actually succeeded.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!token) {
      setState({ status: "error", message: i18n.t("auth:verify.badLink") });
      return;
    }
    dispatch(verifyEmail(token)).then((result) => {
      setState(
        result.meta.requestStatus === "fulfilled"
          ? { status: "ok", message: null }
          : { status: "error", message: messageForError(result.payload, i18n.t("auth:verify.failed")) }
      );
    });
  }, [dispatch, token]);

  return state;
};
