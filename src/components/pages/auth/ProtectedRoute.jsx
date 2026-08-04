import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { selectUser, selectAuthInitialized } from "../../../store/selectors/authSelectors";
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

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = useSelector(selectUser);
  const initialized = useSelector(selectAuthInitialized);

  // Auth check still in progress: don't decide routing yet, or we may
  // bounce a valid (admin) user before their role has loaded.
  if (!initialized) return <AuthPending />;

  if (!user) return <Navigate to="/sign-in" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <RoleDenied />;
  }

  return children;
};

export default ProtectedRoute;
