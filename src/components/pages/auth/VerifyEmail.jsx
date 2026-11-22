import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import AuthLayout from "./AuthLayout";
import { useVerifyEmail } from "./useVerifyEmail";
import { useTranslation } from "react-i18next";

// The landing point of the verification link. There is nothing to fill in — the
// token is the whole request — so it fires on mount and reports what happened.
//
// Reachable without a session on purpose: the link is followed from an inbox,
// often on a device that has never signed in here.
const VerifyEmail = () => {
  const { t } = useTranslation("auth");
  const state = useVerifyEmail();

  if (state.status === "pending") {
    return (
      <AuthLayout title={t("verify.pendingTitle")}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress />
        </Box>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={state.status === "ok" ? t("verify.okTitle") : t("verify.failedTitle")}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {state.status === "ok" ? (
          <Alert severity="success">{t("verify.ok")}</Alert>
        ) : (
          <Alert severity="error">{state.message}</Alert>
        )}
        <Link component={RouterLink} to="/archive" underline="hover">
          {t("verify.toArchive")}
        </Link>
      </Box>
    </AuthLayout>
  );
};

export default VerifyEmail;
