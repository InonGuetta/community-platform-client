import { useState } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import { login } from "../../../store/slicesAndThunks/authSlice/authPost";
import { hebrewForError } from "../../../utilities/apiError";
import AuthLayout from "./AuthLayout";
import { EyeIcon, EyeCrossedIcon, floatingLabelSx, inputBaseSx, submitButtonSx, dividerSx } from "./authShared";
import SocialSignIn from "./SocialSignIn";
import { useAuthSubmit } from "./useAuthSubmit";
import { useOAuthError } from "./useOAuthError";

// Shown when the failure carries no code we have specific Hebrew for. It must
// never fall back to the server's own `message`: that text is English prose
// written for a log, and letting it through is what put "Invalid credentials"
// on screen in a right-to-left Hebrew form.
const FALLBACK = "ההתחברות נכשלה. נסה שוב.";

const SignIn = () => {
  const { error, isSubmitting, submit } = useAuthSubmit(login);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  // A provider sign-in that came back refused or not set up. The form's own
  // error, once there is one, is the newer news and replaces it.
  const oauthError = useOAuthError();

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submit(form);
  };

  return (
    <AuthLayout title="התחברות">
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{hebrewForError(error, FALLBACK)}</Alert>}
      {!error && oauthError && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{oauthError}</Alert>}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
        <TextField
          label="אימייל"
          name="email"
          type="email"
          variant="standard"
          value={form.email}
          onChange={handleChange}
          required
          fullWidth
          sx={floatingLabelSx}
          InputProps={inputBaseSx}
          InputLabelProps={{ required: !form.email }}
        />

        <TextField
          label="סיסמה"
          name="password"
          type={showPassword ? "text" : "password"}
          variant="standard"
          value={form.password}
          onChange={handleChange}
          required
          fullWidth
          sx={floatingLabelSx}
          InputLabelProps={{ required: !form.password }}
          InputProps={{
            ...inputBaseSx,
            endAdornment: form.password ? (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"} sx={{ p: 0.5 }}>
                  {showPassword ? <EyeIcon /> : <EyeCrossedIcon />}
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} sx={submitButtonSx}>
          {isSubmitting ? "..." : "התחברות"}
        </Button>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", my: 3 }}>
        <Divider sx={dividerSx} />
        <Typography sx={{ mx: 2, color: "#6e6e6e", fontSize: "0.8rem" }}>או</Typography>
        <Divider sx={dividerSx} />
      </Box>

      <SocialSignIn verb="התחבר" />

      {/* The way back in for someone who cannot get in, which is the one place
          it is any use — a user who has forgotten their password is looking at
          this screen when they find out. */}
      <Typography textAlign="center" mt={3} variant="body2">
        <Link to="/forgot-password" style={{ color: "#5a5a5a", textDecoration: "none" }}>
          שכחת סיסמה?
        </Link>
      </Typography>

      <Typography textAlign="center" mt={2} variant="body2" color="#757575">
        אין לך חשבון?{" "}
        <Link to="/sign-up" style={{ color: "#424242", fontWeight: 500, textDecoration: "none" }}>הרשמה</Link>
      </Typography>
    </AuthLayout>
  );
};

export default SignIn;
