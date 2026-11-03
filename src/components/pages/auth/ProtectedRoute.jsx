import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { selectUser, selectAuthInitialized, selectAuthUnreachable } from "../../../store/selectors/authSelectors";
import { DOWNLOADS_SHELF } from "../personal/personalShelves";
import { rememberReturnTo } from "../../../utilities/returnTo";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";

// Rendered instead of the page while fetchMe is still in flight. It used to be
// `null`, which is a blank white screen for the length of a round trip — on a
// slow connection that reads as a broken app rather than a loading one.
const AuthPending = () => (
  <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
    <CircularProgress />
  </Box>
);

// A redirect on its own is silent: the user presses a link and simply arrives
// somewhere else, with nothing to say why. Dispatching from an effect rather
// than during render because a reducer must not run inside another component's
// render pass — and it is keyed to the fact of being denied, so it fires once.
const RoleDenied = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(notify({ message: "אין לך הרשאה לגשת לעמוד זה", severity: "warning" }));
  }, [dispatch]);
  return <Navigate to="/archive" replace />;
};

// `offlineOk` is for the one page that works with no server at all: the lessons
// saved on this device (PRD MOB-2).
const ProtectedRoute = ({ children, allowedRoles, offlineOk = false }) => {
  const user = useSelector(selectUser);
  const initialized = useSelector(selectAuthInitialized);
  const unreachable = useSelector(selectAuthUnreachable);
  const location = useLocation();

  // Auth check still in progress: don't decide routing yet, or we may
  // bounce a valid (admin) user before their role has loaded.
  if (!initialized) return <AuthPending />;

  // The server could not be asked who this is — no network, most likely. The
  // sign-in form could not reach it either, so the reader goes to what works
  // without it: the lessons they saved on this device. Those were deleted on
  // sign-out and belong to whoever signed in here last (offlineStore.js).
  if (!user && unreachable) {
    return offlineOk ? children : <Navigate to={DOWNLOADS_SHELF.path} replace />;
  }

  if (!user) {
    // Back here after signing in — a shared lesson or a course's join link
    // (PRD ROST-9) would otherwise be lost on the way. Idempotent, so writing
    // it during render is harmless.
    rememberReturnTo(`${location.pathname}${location.search}`);
    return <Navigate to="/sign-in" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <RoleDenied />;
  }

  return children;
};

export default ProtectedRoute;
