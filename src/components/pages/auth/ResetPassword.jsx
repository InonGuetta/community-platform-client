import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import AuthLayout from "./AuthLayout";
import { resetPassword } from "../../../store/slicesAndThunks/authSlices/authPost";
import { hebrewForError } from "../../../utilities/apiError";
import { floatingLabelSx, inputBaseSx, submitButtonSx, EyeIcon, EyeCrossedIcon } from "./authShared";

// The other half of the reset, opened from the link in the message. The token
// arrives in the query string and is the only credential involved — there is no
// session here by definition.
//
// A successful reset signs the user in and drops them on the archive, because the
// server mints a cookie with it. Sending them to /sign-in to type the password
// they chose four seconds ago is a step that exists only when a flow is built in
// two halves that never met.
const MIN_PASSWORD_LENGTH = 8; // mirrors MIN_PASSWORD_LENGTH in servicesAuth.js

const ResetPassword = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // A link with no token at all is a broken link, and saying so beats a form
  // that collects a password and then fails on submit.
  if (!token) {
    return (
      <AuthLayout title="קישור לא תקין">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="error">הקישור חסר או פגום.</Alert>
          <Link component={RouterLink} to="/forgot-password" underline="hover">
            בקשת קישור חדש
          </Link>
        </Box>
      </AuthLayout>
    );
  }

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

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

  return (
    <AuthLayout title="בחירת סיסמה חדשה">
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="סיסמה חדשה"
          type={show ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          variant="standard"
          fullWidth
          error={tooShort}
          helperText={tooShort ? `לפחות ${MIN_PASSWORD_LENGTH} תווים` : " "}
          sx={floatingLabelSx}
          InputProps={{
            ...inputBaseSx,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShow((v) => !v)} edge="end" aria-label="הצג סיסמה">
                  {show ? <EyeCrossedIcon /> : <EyeIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Confirmed rather than trusted: this is the one password the user
            cannot check by signing in with it afterwards — a typo here locks
            them out again and the only way back is another email. */}
        <TextField
          label="אימות סיסמה"
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          variant="standard"
          fullWidth
          error={mismatch}
          helperText={mismatch ? "הסיסמאות אינן תואמות" : " "}
          sx={floatingLabelSx}
          InputProps={inputBaseSx}
        />

        <Button
          type="submit"
          disabled={busy || mismatch || tooShort || password.length === 0 || confirm.length === 0}
          sx={submitButtonSx}
        >
          {busy ? <CircularProgress size={20} /> : "שמור והתחבר"}
        </Button>

        <Typography variant="caption" color="text.secondary" textAlign="center">
          שמירת סיסמה חדשה מנתקת כל מכשיר אחר שמחובר לחשבון.
        </Typography>
      </Box>
    </AuthLayout>
  );
};

export default ResetPassword;
