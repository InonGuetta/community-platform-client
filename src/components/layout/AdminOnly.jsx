import { useAdminView } from "./useAdminView";

// Renders its children only while "תצוגת מנהל" is on for a lecturer or an admin
// — the mockups' `admin-only` class as a component (D-07). Display only: what
// the children may DO is still decided by their own permission checks and by
// the server.
const AdminOnly = ({ children }) => {
  const { showAdmin } = useAdminView();
  return showAdmin ? children : null;
};

export default AdminOnly;
