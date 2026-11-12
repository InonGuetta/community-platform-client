import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import CloseIcon from "@mui/icons-material/Close";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import InstallMobileIcon from "@mui/icons-material/InstallMobile";
import { PERSONAL_SHELVES } from "../personalShelves";
import { roleLabels } from "../../../utilities/constant";
import { BAR_HEIGHT } from "./navStyles";
import { avatarInitial } from "./useAccount";
import NavLinkLabel from "./NavLinkLabel";

// The personal drawer is confined to the left-image column so it opens *over*
// the image only. These match the archive left-image geometry (ArchivePage):
// the image is 24vw wide, sits below the 64px navbar, and fills the rest.
const DRAWER_TOP = BAR_HEIGHT; // start below the sticky navbar
// 85% of the image column (24vw * 0.85) from md up, where that column exists.
// Below md there is no image column, and 20.4vw of a 375px phone is 77px — the
// menu holding every link on a phone was a strip too narrow to read (found in
// the PRD MOB-7 review). There it takes most of the screen instead.
const DRAWER_WIDTH = { xs: "min(85vw, 320px)", md: "20.4vw" };

// Personal-details drawer. Confined to the left-image column: it opens
// over the image only, below the navbar, at 85% of the image width.
// It behaves as a floating panel, NOT a blocking modal: no backdrop, the
// page scroll isn't locked, and the modal root passes pointer/scroll
// events through (pointerEvents:none) so the rest of the page stays
// scrollable and clickable. Only the panel itself is interactive
// (pointerEvents:auto). Close via the X button, the hamburger toggle, or
// Esc while focused — never by navigating.
// RTL note: this app has no emotion RTL cache, so MUI positions the paper
// by the *literal* anchor ("left" => left:0) but still flips the Slide
// direction for RTL. We override the transition to direction="right" so
// the panel slides IN from the left edge instead of dragging across.
const UserDrawer = ({
  drawerOpen, setDrawerOpen, user, role, pathname, links, pendingRoleRequests, installer, handleLogout,
}) => (
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

      {/* The user's own material — their notes, the lectures they liked and
          the ones they saved. Promoted above the divider because these are
          personal collections rather than places to browse, and they are the
          same three the top bar's "תוכן אישי" dropdown offers. */}
      <List>
        {PERSONAL_SHELVES.map(({ label, path, Icon, iconColour }) => (
          <ListItem key={path} disablePadding>
            {/* Navigation does NOT close the drawer — it stays open until the
                user explicitly closes it with the X button (or Esc). */}
            <ListItemButton component={Link} to={path} selected={pathname === path}>
              {/* The LABEL stays navy in every row: only the icon carries the
                  shelf's own colour, so the list still reads as one column of
                  links rather than as two of them in different inks. */}
              <Icon fontSize="small" sx={{ color: iconColour || "primary.main", ml: 1 }} />
              <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 800, color: "primary.main" }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Navigation links. No filtering needed: the personal shelves live in
          personalShelves.js only, so nothing here can be a second copy. */}
      <List>
        {links.map((link) => (
          <ListItem key={link.label} disablePadding>
            <ListItemButton
              component={Link}
              to={link.to}
              selected={pathname === link.to}
            >
              <ListItemText primary=<NavLinkLabel link={link} pendingRoleRequests={pendingRoleRequests} /> primaryTypographyProps={{ fontWeight: 700, color: "primary.main" }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      <List>
        {/* PRD MOB-1 — offered only where installing is possible and the
            app is not already running installed. See useInstallPrompt. */}
        {installer.offer && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => { setDrawerOpen(false); installer.install(); }}>
              <ListItemIcon sx={{ minWidth: 36, color: "primary.main" }}><InstallMobileIcon /></ListItemIcon>
              <ListItemText primary="התקנת האפליקציה" primaryTypographyProps={{ fontWeight: 700, color: "primary.main" }} />
            </ListItemButton>
          </ListItem>
        )}
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemText primary="התנתקות" primaryTypographyProps={{ fontWeight: 700, color: "error.main" }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  </Drawer>
);

export default UserDrawer;
