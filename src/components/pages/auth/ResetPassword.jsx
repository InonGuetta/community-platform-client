import { Link as RouterLink } from "react-router-dom";
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
import { useResetPassword } from "./useResetPassword";
import { floatingLabelSx, inputBaseSx, submitButtonSx, EyeIcon, EyeCrossedIcon } from "./authShared";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("auth");
  const { token, password, setPassword, confirm, setConfirm, show, setShow, error, busy, handleSubmit } = useResetPassword();

  // A link with no token at all is a broken link, and saying so beats a form
  // that collects a password and then fails on submit.
  if (!token) {
    return (
      <AuthLayout title={t("reset.badLinkTitle")}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="error">{t("reset.badLink")}</Alert>
          <Link component={RouterLink} to="/forgot-password" underline="hover">
            {t("reset.requestNew")}
          </Link>
        </Box>
      </AuthLayout>
    );
  }

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  return (
    <AuthLayout title={t("reset.title")}>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label={t("fields.newPassword")}
          type={show ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          variant="standard"
          fullWidth
          error={tooShort}
          helperText={tooShort ? t("fields.minLength", { n: MIN_PASSWORD_LENGTH }) : " "}
          sx={floatingLabelSx}
          InputProps={{
            ...inputBaseSx,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShow((v) => !v)} edge="end" aria-label={show ? t("fields.hidePassword") : t("fields.showPassword")}>
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
          label={t("fields.confirmPassword")}
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          variant="standard"
          fullWidth
          error={mismatch}
          helperText={mismatch ? t("fields.mismatch") : " "}
          sx={floatingLabelSx}
          InputProps={inputBaseSx}
        />

        <Button
          type="submit"
          disabled={busy || mismatch || tooShort || password.length === 0 || confirm.length === 0}
          sx={submitButtonSx}
        >
          {busy ? <CircularProgress size={20} /> : t("reset.save")}
        </Button>

        <Typography variant="caption" color="text.secondary" textAlign="center">
          {t("reset.signsOutOthers")}
        </Typography>
      </Box>
    </AuthLayout>
  );
};

export default ResetPassword;
