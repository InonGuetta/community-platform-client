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
import { authApi } from "../../../api/authApi";
import { hebrewForError } from "../../../utilities/apiError";
import AuthLayout from "./AuthLayout";
import { GoogleIcon, EyeIcon, EyeCrossedIcon, floatingLabelSx, inputBaseSx, submitButtonSx, googleButtonSx, dividerSx } from "./authShared";
import { useAuthSubmit } from "./useAuthSubmit";

// Shown when the failure carries no code we have specific Hebrew for. It must
// never fall back to the server's own `message`: that text is English prose
// written for a log, and letting it through is what put "Invalid credentials"
// on screen in a right-to-left Hebrew form.
const FALLBACK = "ההתחברות נכשלה. נסה שוב.";

const SignIn = () => {
  const { error, isSubmitting, submit } = useAuthSubmit(login);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submit(form);
  };

  return (
    <AuthLayout title="התחברות">
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{hebrewForError(error, FALLBACK)}</Alert>}

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

      <Button variant="outlined" fullWidth startIcon={<GoogleIcon />}
        onClick={() => { window.location.href = authApi.googleLoginUrl; }}
        sx={googleButtonSx}
      >
        התחברות עם Google
      </Button>

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
