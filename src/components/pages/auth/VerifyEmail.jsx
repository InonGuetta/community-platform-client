import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import AuthLayout from "./AuthLayout";
import { verifyEmail } from "../../../store/slicesAndThunks/authSlices/authPost";
import { hebrewForError } from "../../../utilities/apiError";

// The landing point of the verification link. There is nothing to fill in — the
// token is the whole request — so it fires on mount and reports what happened.
//
// Reachable without a session on purpose: the link is followed from an inbox,
// often on a device that has never signed in here.
const VerifyEmail = () => {
  const dispatch = useDispatch();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState({ status: "pending", message: null });

  // React 18's StrictMode mounts effects twice in development, and this one
  // SPENDS a single-use token: without the guard the second run consumes the
  // token the first just burned and reports the link as invalid, on a
  // verification that actually succeeded.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!token) {
      setState({ status: "error", message: "הקישור חסר או פגום." });
      return;
    }
    dispatch(verifyEmail(token)).then((result) => {
      setState(
        result.meta.requestStatus === "fulfilled"
          ? { status: "ok", message: null }
          : { status: "error", message: hebrewForError(result.payload, "האימות נכשל.") }
      );
    });
  }, [dispatch, token]);

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
