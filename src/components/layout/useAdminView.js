import { useContext } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../../store/selectors/authSelectors";
import { isPrivileged } from "../../utilities/permissions";
import { AdminViewContext } from "./adminView";

// Who may flip "תצוגת מנהל", whether it is on, and the answer every admin-only
// element asks: `showAdmin`.
//
// Eligible = whoever sees management controls today: a lecturer or an admin
// (isPrivileged; D-07). For anyone else `showAdmin` is false whatever the
// stored preference says — the switch hides, it never reveals.
//
// An element marked admin-only in the mockups renders when `showAdmin` is true:
//   const { showAdmin } = useAdminView();  …  {canManage && showAdmin && <Badge/>}
// or wrapped in <AdminOnly> (AdminOnly.jsx) when it has no condition of its own.
// It is ANDed with the element's own permission check, never a replacement for it.
export const useAdminView = () => {
  const { enabled, toggle } = useContext(AdminViewContext);
  const eligible = isPrivileged(useSelector(selectUser));
  return { eligible, enabled, showAdmin: eligible && enabled, toggle };
};

export default useAdminView;
