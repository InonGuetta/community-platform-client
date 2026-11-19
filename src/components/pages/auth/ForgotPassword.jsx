import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import AuthLayout from "./AuthLayout";
import { useForgotPassword } from "./useForgotPassword";
import { AuthFootnote, AuthLink } from "./authShared";
import { useTranslation } from "react-i18next";

// "Forgot password" — which until now did not exist, and its absence was the one
// thing on this platform with no workaround at all: a user who forgot their
// password was locked out permanently, since an admin cannot set one either.
//
// The screen deliberately says the SAME thing whether or not the address has an
// account. The server answers identically for that reason, and reproducing the
// difference here — "no such user" — would rebuild the enumeration oracle in the
// UI that the endpoint refuses to be. The sentence is written so it is true
// either way rather than being a comfortable lie in one of them.
const ForgotPassword = () => {
  const { t } = useTranslation("auth");
  const { email, setEmail, sent, failed, busy, handleSubmit } = useForgotPassword();

  if (sent) {
    return (
      <AuthLayout title={t("forgot.sentTitle")}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="success">
            {t("forgot.sent", { email: email.trim() })}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {t("forgot.sentHint")}
          </Typography>
          <AuthFootnote sx={{ mt: 1 }}>
            <AuthLink to="/sign-in" accent>{t("forgot.backToSignIn")}</AuthLink>
          </AuthFootnote>
        </Box>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("forgot.title")} intro={t("forgot.intro")}>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {failed && <Alert severity="error">{t("forgot.failed")}</Alert>}

        <TextField
          label={t("fields.email")}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          fullWidth
        />

        <Button type="submit" variant="contained" fullWidth disabled={busy || !email.trim()} sx={{ minHeight: 48, mt: 1 }}>
          {busy ? <CircularProgress size={20} /> : t("forgot.send")}
        </Button>

        <AuthFootnote sx={{ mt: 1.5 }}>
          <AuthLink to="/sign-in" accent>{t("forgot.backToSignIn")}</AuthLink>
        </AuthFootnote>
      </Box>
    </AuthLayout>
  );
};

export default ForgotPassword;
