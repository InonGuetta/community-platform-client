import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { selectUser, selectAuthInitialized } from "../../../store/selectors/authSelectors";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = useSelector(selectUser);
  const initialized = useSelector(selectAuthInitialized);

  // Auth check still in progress: don't decide routing yet, or we may
  // bounce a valid (admin) user before their role has loaded.
  if (!initialized) return null;

  if (!user) return <Navigate to="/sign-in" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/archive" replace />;
  }

  return children;
};

export default ProtectedRoute;
