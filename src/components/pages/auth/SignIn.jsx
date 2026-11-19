import { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { login } from "../../../store/slicesAndThunks/authSlice/authPost";
import { messageForError } from "../../../utilities/apiError";
import AuthLayout from "./AuthLayout";
import { EyeIcon, EyeCrossedIcon, OrDivider, AuthFootnote, AuthLink } from "./authShared";
import SocialSignIn from "./SocialSignIn";
import { useAuthSubmit } from "./useAuthSubmit";
import { useOAuthError } from "./useOAuthError";
import { useTranslation } from "react-i18next";

const SignIn = () => {
  const { t } = useTranslation("auth");
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
    <AuthLayout title={t("signIn.title")}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{messageForError(error, t("signIn.failed"))}</Alert>}
      {!error && oauthError && <Alert severity="warning" sx={{ mb: 2 }}>{oauthError}</Alert>}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label={t("fields.email")}
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          fullWidth
          InputLabelProps={{ required: false }}
        />

        <TextField
          label={t("fields.password")}
          name="password"
          type={showPassword ? "text" : "password"}
          value={form.password}
          onChange={handleChange}
          required
          fullWidth
          InputLabelProps={{ required: false }}
          InputProps={{
            endAdornment: form.password ? (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" aria-label={showPassword ? t("fields.hidePassword") : t("fields.showPassword")} sx={{ p: 0.5 }}>
                  {showPassword ? <EyeIcon /> : <EyeCrossedIcon />}
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} sx={{ minHeight: 48, mt: 1 }}>
          {isSubmitting ? "..." : t("signIn.submit")}
        </Button>
      </Box>

      <OrDivider>{t("or")}</OrDivider>

      <SocialSignIn mode="signIn" />

      {/* The way back in for someone who cannot get in, which is the one place
          it is any use — a user who has forgotten their password is looking at
          this screen when they find out. */}
      <AuthFootnote sx={{ mt: 3.5, mb: 1 }}>
        <AuthLink to="/forgot-password" accent>{t("signIn.forgot")}</AuthLink>
      </AuthFootnote>

      <AuthFootnote sx={{ mt: 1 }}>
        {t("signIn.noAccount")}{" "}
        <AuthLink to="/sign-up">{t("signIn.toSignUp")}</AuthLink>
      </AuthFootnote>
    </AuthLayout>
  );
};

export default SignIn;
