import { useState, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { logout } from "../../../store/slicesAndThunks/authSlices/authPost";
import { selectUser, selectUserRole } from "../../../store/selectors/authSelectors";
import { ColorModeContext } from "../../../theme/colorMode";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { roles, roleLabels } from "../../../utilities/constant";

// Every entry here must map to a real route in App.jsx. A link to a path with
// no route silently falls through to the "*" catch-all (=> /archive), which
// looks like two different tabs opening the same page.
// Note: bookmarks are per-media markers on the player timeline (MediaViewPage),
// not a page of their own — so there is deliberately no bookmarks entry.
// Order matters and is shared: this array drives both the desktop links row and
// the drawer list, so the two always read in the same order. "המחברת שלי" leads
// because the drawer promotes it to its own section at the top.
const studentLinks = [
  { label: "המחברת שלי", to: "/notebook" },
  { label: "ארכיון", to: "/archive" },
  { label: "מפגשים", to: "/sessions" },
  { label: "תרומה", to: "/donate" },
];

const adminLinks = [
  ...studentLinks,
  { label: "משתמשים", to: "/users" },
  { label: "ניהול", to: "/admin" },
];

// Lecturers navigate exactly like students: uploading is the "העלאת מדיה"
// button on the archive page itself, so it needs no separate nav entry.
const getLinksByRole = (role) => (role === roles.admin ? adminLinks : studentLinks);

const avatarInitial = (user) => user?.display_name?.[0]?.toUpperCase() || "U";

// The personal drawer is confined to the left-image column so it opens *over*
// the image only. These match the archive left-image geometry (ArchivePage):
// the image is 24vw wide, sits below the 64px navbar, and fills the rest.
const DRAWER_TOP = 64; // px — start below the sticky navbar
const DRAWER_WIDTH = "20.4vw"; // 85% of the image width (24vw * 0.85)

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useSelector(selectUser);
  const role = useSelector(selectUserRole);

  const links = getLinksByRole(role);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { mode, toggle: toggleColorMode } = useContext(ColorModeContext);

  const handleLogout = async () => {
    setDrawerOpen(false);
    await dispatch(logout());
    navigate("/sign-in");
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={(theme) => ({
        background: "linear-gradient(135deg, #cce9f2 0%, #e6f5fb 55%, #f1fafc 100%)",
        borderBottom: "1px solid rgba(26,74,102,0.10)",
        // Dark override only — the light gradient above is preserved exactly.
        ...(theme.palette.mode === "dark" && {
          background: "linear-gradient(135deg, #13202a 0%, #16242d 55%, #182b34 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }),
      })}
    >
      <Toolbar sx={{ gap: 1, minHeight: 64 }}>
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
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0, flexGrow: 1, alignSelf: "stretch" }}>
          {links.map((link) => {
            const isActive = pathname === link.to;
            return (
              <Button
                key={link.label}
                component={Link}
                to={link.to}
                size="small"
                sx={{
                  color: "primary.main",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  borderRadius: 0,
                  px: 2,
                  bgcolor: isActive ? "rgba(26,74,102,0.12)" : "transparent",
                  "&:hover": { bgcolor: "rgba(26,74,102,0.08)" },
                }}
              >
                {link.label}
              </Button>
            );
          })}
        </Box>

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

        {/* User block — desktop only. */}
        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: "transparent", color: "primary.main", border: "1.5px solid", borderColor: "primary.main", fontSize: 14, fontWeight: 700 }}>
            {avatarInitial(user)}
          </Avatar>
          <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ display: { xs: "none", sm: "block" } }}>
            {user?.display_name}
          </Typography>
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

      {/* Personal-details drawer. Confined to the left-image column: it opens
          over the image only, below the navbar, at 85% of the image width.
          It behaves as a floating panel, NOT a blocking modal: no backdrop, the
          page scroll isn't locked, and the modal root passes pointer/scroll
          events through (pointerEvents:none) so the rest of the page stays
          scrollable and clickable. Only the panel itself is interactive
          (pointerEvents:auto). Close via the X button, the hamburger toggle, or
          Esc while focused — never by navigating.
          RTL note: this app has no emotion RTL cache, so MUI positions the paper
          by the *literal* anchor ("left" => left:0) but still flips the Slide
          direction for RTL. We override the transition to direction="right" so
          the panel slides IN from the left edge instead of dragging across. */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        hideBackdrop
        ModalProps={{
          disableScrollLock: true,
          disableEnforceFocus: true,
          sx: { pointerEvents: "none" },
        }}
        slotProps={{
          transition: { direction: "right" },
          paper: {
            sx: {
              width: DRAWER_WIDTH,
              top: DRAWER_TOP,
              height: `calc(100vh - ${DRAWER_TOP}px)`,
              boxSizing: "border-box",
              pointerEvents: "auto",
            },
          },
        }}
      >
        <Box sx={{ width: "100%", position: "relative" }} role="presentation">
          {/* Close button — top-right corner of the panel itself. */}
          <IconButton
            onClick={() => setDrawerOpen(false)}
            aria-label="סגירת התפריט"
            sx={{ position: "absolute", top: 8, right: 8, color: "error.main", zIndex: 1 }}
          >
            <CloseIcon sx={{ fontSize: 38 }} />
          </IconButton>

          {/* Personal details header */}
          <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: "transparent", color: "primary.main", border: "2px solid", borderColor: "primary.main", fontSize: 26, fontWeight: 700 }}>
              {avatarInitial(user)}
            </Avatar>
            <Typography fontWeight={800} color="primary.main" noWrap sx={{ maxWidth: "100%" }}>
              {user?.display_name || "משתמש"}
            </Typography>
          </Box>

          {/* Detail rows */}
          <List dense>
            {user?.email && (
              <ListItem>
                <EmailOutlinedIcon fontSize="small" sx={{ color: "primary.main", ml: 1 }} />
                <ListItemText primary={user.email} primaryTypographyProps={{ variant: "body2", noWrap: true, color: "text.secondary" }} />
              </ListItem>
            )}
            <ListItem>
              <BadgeOutlinedIcon fontSize="small" sx={{ color: "primary.main", ml: 1 }} />
              <ListItemText primary={roleLabels[role] || "משתמש"} primaryTypographyProps={{ variant: "body2", color: "text.secondary" }} />
            </ListItem>
          </List>

          <Divider />

          {/* Personal notebook — prominent entry */}
          <List>
            <ListItem disablePadding>
              {/* Navigation does NOT close the drawer — it stays open until the
                  user explicitly closes it with the X button (or Esc). */}
              <ListItemButton
                component={Link}
                to="/notebook"
                selected={pathname === "/notebook"}
              >
                <MenuBookIcon fontSize="small" sx={{ color: "primary.main", ml: 1 }} />
                <ListItemText primary="המחברת שלי" primaryTypographyProps={{ fontWeight: 800, color: "primary.main" }} />
              </ListItemButton>
            </ListItem>
          </List>

          <Divider />

          {/* Navigation links */}
          <List>
            {links.filter((link) => link.to !== "/notebook").map((link) => (
              <ListItem key={link.label} disablePadding>
                <ListItemButton
                  component={Link}
                  to={link.to}
                  selected={pathname === link.to}
                >
                  <ListItemText primary={link.label} primaryTypographyProps={{ fontWeight: 700, color: "primary.main" }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Divider />

          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemText primary="התנתקות" primaryTypographyProps={{ fontWeight: 700, color: "error.main" }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default Navbar;
