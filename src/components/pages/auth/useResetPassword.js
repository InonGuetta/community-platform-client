import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../../store/slicesAndThunks/authSlices/authPost";
import { hebrewForError } from "../../../utilities/apiError";

// What the reset link does: the token it carries, the new password typed
// twice, and the reset itself — so that ResetPassword.jsx is layout only.

export const useResetPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await dispatch(resetPassword({ token, password }));
    setBusy(false);

    if (result.meta.requestStatus === "fulfilled") {
      navigate("/archive", { replace: true });
      return;
    }
    // Keyed on the code, never on the server's English prose — see apiError.js.
    setError(hebrewForError(result.payload, "איפוס הסיסמה נכשל. נסה שוב."));
  };

  return { token, password, setPassword, confirm, setConfirm, show, setShow, error, busy, handleSubmit };
};
