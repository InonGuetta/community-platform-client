import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { selectUser, selectUserRole } from "../../../store/selectors/authSelectors";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = useSelector(selectUser);
  const token = localStorage.getItem("token");

  if (!user && !token) return <Navigate to="/sign-in" replace />;
  if (!user) return null;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/archive" replace />;
  }

  return children;
};

export default ProtectedRoute;
