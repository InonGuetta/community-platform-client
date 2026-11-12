import { useState, useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import MenuIcon from "@mui/icons-material/Menu";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { ColorModeContext } from "../../../theme/colorMode";
import { PERSONAL_SHELVES } from "../personalShelves";
import NotificationBell from "./NotificationBell";
import useNotificationBell from "./useNotificationBell";
import useInstallPrompt from "./useInstallPrompt";
import InstallHelpDialog from "./InstallHelpDialog";
import { useAccount, avatarInitial } from "./useAccount";
import { getLinksByRole } from "./navLinks";
import { BAR_HEIGHT, barSurfaceSx } from "./navStyles";
import NavLinksBar from "./NavLinksBar";
import PersonalMenu from "./PersonalMenu";
import UserDrawer from "./UserDrawer";

// The top bar. Which links each role is offered is navLinks.js and how a tab
// looks is navStyles.js; the desktop row of tabs is NavLinksBar, the "תוכן אישי"
// panel PersonalMenu, and the hamburger's panel UserDrawer. The brand, the bell,
// the colour toggle and the user block are here.
const Navbar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, role, signOut } = useAccount();

  const links = getLinksByRole(role);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [personalAnchor, setPersonalAnchor] = useState(null);
  const personalActive = PERSONAL_SHELVES.some((shelf) => shelf.path === pathname);
  const { mode, toggle: toggleColorMode } = useContext(ColorModeContext);
  const bell = useNotificationBell();
  const installer = useInstallPrompt();

  const handleLogout = async () => {
    setDrawerOpen(false);
    // The offline lessons go first, then the session — see useAccount.
    await signOut();
    navigate("/sign-in");
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      // The gradient and the edge tone come from barSurfaceSx, which the personal
      // dropdown's paper also uses — restyling the bar restyles what hangs off it.
      // Width and style as longhands so they cannot reset the colour above them.
      sx={(theme) => ({
        ...barSurfaceSx(theme),
        borderBottomWidth: "1px",
        borderBottomStyle: "solid",
      })}
    >
      <Toolbar sx={{ gap: 1, minHeight: BAR_HEIGHT }}>
        <Typography
          variant="h6"
          fontWeight={800}
          color="primary"
          component={Link}
          to="/archive"
          sx={{
            mr: 3,
            flexShrink: 0,
            letterSpacing: 0.2,
            // On mobile the brand grows to push the compact avatar to the far
            // edge; on desktop it stays natural width so the links row fills.
            flexGrow: { xs: 1, md: 0 },
            textDecoration: "none",
          }}
        >
          פלטפורמת הקהילה
        </Typography>

        {/* Inline links — desktop only. */}
        <NavLinksBar
          links={links}
          pathname={pathname}
          personalActive={personalActive}
          personalAnchor={personalAnchor}
          setPersonalAnchor={setPersonalAnchor}
          pendingRoleRequests={bell.pendingRoleRequests}
        />

        {/* The personal shelves, one click down from the bar rather than three
            tabs across it. */}
        <PersonalMenu personalAnchor={personalAnchor} setPersonalAnchor={setPersonalAnchor} pathname={pathname} />

        {/* The bell — always visible, at every width. */}
        <NotificationBell
          items={bell.items}
          unread={bell.unread}
          anchor={bell.anchor}
          open={bell.open}
          onOpen={bell.handleOpen}
          onClose={bell.handleClose}
          onSelect={bell.handleSelect}
          onMarkAllRead={bell.handleMarkAllRead}
        />

        {/* Light/dark toggle — always visible. */}
        <Tooltip title={mode === "dark" ? "מצב בהיר" : "מצב כהה"}>
          <IconButton
            onClick={toggleColorMode}
            aria-label="החלפת מצב תצוגה"
            sx={{ color: "primary.main" }}
          >
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>

        {/* User block — desktop only. The avatar and the name are the link to
            the account page: it is where a user looks for their own settings,
            and it costs no room in a bar that is already full. */}
        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1.5 }}>
          <Tooltip title="החשבון שלי">
            <Box
              component={Link}
              to="/profile"
              sx={{ display: "flex", alignItems: "center", gap: 1.5, textDecoration: "none" }}
            >
              <Avatar
                src={user?.avatar_url || undefined}
                sx={{ width: 34, height: 34, bgcolor: "transparent", color: "primary.main", border: "1.5px solid", borderColor: "primary.main", fontSize: 14, fontWeight: 700 }}
              >
                {avatarInitial(user)}
              </Avatar>
              <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ display: { xs: "none", sm: "block" } }}>
                {user?.display_name}
              </Typography>
            </Box>
          </Tooltip>
          <Button
            size="small"
            variant="outlined"
            onClick={handleLogout}
            sx={{ fontWeight: 700, fontSize: "0.75rem", letterSpacing: 0.8, textTransform: "uppercase", borderRadius: 1.5, color: "primary.main", borderColor: "primary.main" }}
          >
            התנתקות
          </Button>
        </Box>

        {/* Compact avatar — mobile only (logout lives inside the drawer). */}
        <Avatar sx={{ display: { xs: "flex", md: "none" }, width: 34, height: 34, bgcolor: "transparent", color: "primary.main", border: "1.5px solid", borderColor: "primary.main", fontSize: 14, fontWeight: 700 }}>
          {avatarInitial(user)}
        </Avatar>

        {/* Hamburger — always visible. Sits at the far-left edge (leftmost under
            RTL) so it aligns above the left-image column the drawer opens over.
            Acts as a toggle: pressing it while the drawer is open closes it,
            exactly like the panel's X button. */}
        <IconButton
          onClick={() => setDrawerOpen((prev) => !prev)}
          aria-label={drawerOpen ? "סגירת תפריט אישי" : "פתיחת תפריט אישי"}
          aria-expanded={drawerOpen}
          sx={{ color: "primary.main", ml: { md: 1 } }}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>

      <UserDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        user={user}
        role={role}
        pathname={pathname}
        links={links}
        pendingRoleRequests={bell.pendingRoleRequests}
        installer={installer}
        handleLogout={handleLogout}
      />
      <InstallHelpDialog open={installer.iosHelpOpen} onClose={installer.closeIosHelp} />
    </AppBar>
  );
};

export default Navbar;
