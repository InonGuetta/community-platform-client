import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import AuthLayout from "./AuthLayout";
import { useVerifyEmail } from "./useVerifyEmail";

// The landing point of the verification link. There is nothing to fill in — the
// token is the whole request — so it fires on mount and reports what happened.
//
// Reachable without a session on purpose: the link is followed from an inbox,
// often on a device that has never signed in here.
const VerifyEmail = () => {
  const state = useVerifyEmail();

  if (state.status === "pending") {
    return (
      <AuthLayout title="מאמת כתובת">
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress />
        </Box>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={state.status === "ok" ? "הכתובת אומתה" : "האימות נכשל"}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {state.status === "ok" ? (
          <Alert severity="success">כתובת האימייל שלך אומתה בהצלחה.</Alert>
        ) : (
          <Alert severity="error">{state.message}</Alert>
        )}
        <Link component={RouterLink} to="/archive" underline="hover">
          לארכיון
        </Link>
      </Box>
    </AuthLayout>
  );
};

export default VerifyEmail;
