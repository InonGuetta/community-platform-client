import { useContext, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { ColorModeContext } from "../../../theme/colorMode";
import { openUpload } from "../../../store/slicesAndThunks/uiSlice";
import { navConfigFor } from "../navConfig";
import { useAdminView } from "../useAdminView";
import { useAccount } from "./useAccount";
import useNotificationBell from "./useNotificationBell";
import useInstallPrompt from "./useInstallPrompt";

// Everything the header and what hangs off it (the avatar menu, the drawer)
// need, gathered once: who is signed in, what navConfig offers their role, the
// bell's poll, "תצוגת מנהל", the colour mode, installing, and what each menu
// action does. AppHeader renders it; AvatarMenu and NavDrawer receive it.
const useAppShell = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, role, signOut } = useAccount();
  const adminView = useAdminView();
  const { mode, toggle: toggleColorMode } = useContext(ColorModeContext);
  const bell = useNotificationBell();
  const installer = useInstallPrompt();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const config = navConfigFor(role);
  const closeAll = () => {
    setMenuAnchor(null);
    setDrawerOpen(false);
  };

  const handleLogout = async () => {
    closeAll();
    // The offline lessons go first, then the session — see useAccount.
    await signOut();
    navigate("/sign-in");
  };

  // An item with an `action` instead of a route (navConfig). "upload" opens
  // the upload dialog, which lives on the archive: the open flag is in the
  // store, so the dialog is up as soon as the archive mounts (D-09).
  const runAction = (action) => {
    closeAll();
    if (action === "upload") {
      dispatch(openUpload());
      navigate("/archive");
    }
  };

  const install = () => {
    closeAll();
    installer.install();
  };

  return {
    user,
    role,
    pathname,
    config,
    adminView,
    darkMode: mode === "dark",
    toggleColorMode,
    bell,
    installer,
    install,
    // Shown on the avatar only while the admin group that holds "משתמשים" is
    // on screen (D-08); the bell does not list role requests.
    pendingRoleRequests: adminView.showAdmin ? bell.pendingRoleRequests || 0 : 0,
    menuAnchor,
    openMenu: (event) => setMenuAnchor(event.currentTarget),
    closeMenu: () => setMenuAnchor(null),
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    handleLogout,
    runAction,
  };
};

export default useAppShell;
