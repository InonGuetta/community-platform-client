import { useState } from "react";
import { useDispatch } from "react-redux";
import { requestPasswordReset } from "../../../store/slicesAndThunks/authSlice/authPost";

// What the forgot-password page does — sends the address, and tells a request
// that never arrived from one that was handled — so that ForgotPassword.jsx is
// layout only.

export const useForgotPassword = () => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFailed(false);
    const result = await dispatch(requestPasswordReset(email.trim()));
    setBusy(false);
    // Only a request that never reached the server is reported as a failure. A
    // 200 means "handled", and what it was handled as is none of the caller's
    // business.
    if (result.meta.requestStatus === "fulfilled") setSent(true);
    else setFailed(true);
  };

  return { email, setEmail, sent, failed, busy, handleSubmit };
};
