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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import { PERSONAL_SHELVES } from "../../pages/personal/personalShelves";
import { roles, roleLabels } from "../../../utilities/constant";

// Every entry here must map to a real route in App.jsx. A link to a path with
// no route silently falls through to the "*" catch-all (=> /archive), which
// looks like two different tabs opening the same page.
// Note: bookmarks are per-media markers on the player timeline (MediaViewPage),
// not a page of their own — so there is deliberately no bookmarks entry.
// Order matters and is shared: this array drives both the desktop links row and
// the drawer list, so the two always read in the same order.
//
// The user's OWN collections are not here — they live in personalShelves.js and
// reach the bar through a single "תוכן אישי" dropdown. Three separate tabs
// for three personal shelves crowded out the places everyone actually browses,
// and they grow with every new kind of thing a user can keep.
const studentLinks = [
  { label: "ארכיון", to: "/archive" },
  { label: "מפגשים", to: "/sessions" },
  { label: "תרומה", to: "/donate" },
];

// Lecturers get the courses entry — they run their own courses — but nothing
// else: uploading is the "העלאת מדיה" button on the archive page itself, so it
// needs no separate nav entry.
const lecturerLinks = [
  ...studentLinks,
  { label: "קורסים", to: "/courses" },
];

const adminLinks = [
  ...lecturerLinks,
  { label: "משתמשים", to: "/users" },
  { label: "ניהול", to: "/admin" },
];

// The user's own material comes from personalShelves.js rather than being listed
// here: that file is also what App.jsx builds the routes from and what each
// page takes its heading from, so a label or a path is stated once for all four.
// This bar feeds both the "תוכן אישי" dropdown and the drawer's top section from
// it, which is what stops those two from telling different stories.

// ── What a top-bar tab looks like ───────────────────────────────────────────
//
// Split into three named pieces because the "תוכן אישי" dropdown wears all of
// them too: it hangs off the bar and has to read as a continuation of it, not as
// a generic MUI menu that happens to open underneath. Anything stated inline
// here twice would be the thing that stops matching the first time the bar is
// restyled.

// How thick the bar is, in px. Its tabs are exactly this tall — they stretch to
// the toolbar — so the dropdown's tabs take it too, and the drawer starts at it.
// The number was written out at all three, which is why the dropdown came out
// visibly thinner than the strip it is supposed to continue.
const BAR_HEIGHT = 64;

// The tints the bar paints its own tabs with. Deliberately the same literals in
// both modes, exactly as the bar has always used them.
const NAV_HOVER = "rgba(26,74,102,0.08)";
const NAV_ACTIVE = "rgba(26,74,102,0.12)";

// The lettering: small, spaced, uppercase, in the brand navy.
const navLabelSx = {
  color: "primary.main",
  fontWeight: 700,
  fontSize: "0.75rem",
  letterSpacing: 0.8,
  textTransform: "uppercase",
};

// The bar's surface — its gradient and the tone of its hairline edge. Used by
// the AppBar itself and by the dropdown's paper, so the two are the same
// material. The dark values are the bar's existing override, not a new choice.
//
// LONGHANDS, deliberately, and this is not a style preference. `background` and
// `border` are shorthands that RESET the properties they do not mention:
// `background: <gradient>` writes the gradient into background-image, and
// `border: 1px solid` resets border-color to currentColor. Mixed with the
// callers' own declarations that produced two silent failures — a later
// `backgroundImage: none` erased the gradient and left a white panel, and a
// later `border` shorthand repainted the hairline in the text colour. Longhands
// do not reach across into each other, so the result no longer depends on which
// key a caller happens to write second.
//
// backgroundImage is also what overrides MUI's dark-mode elevation overlay,
// which is itself a background-image — so no separate cancelling is needed.
const barSurfaceSx = (theme) =>
  theme.palette.mode === "dark"
    ? {
        backgroundImage: "linear-gradient(135deg, #13202a 0%, #16242d 55%, #182b34 100%)",
        backgroundColor: "transparent",
        borderColor: "rgba(255,255,255,0.08)",
      }
    : {
        backgroundImage: "linear-gradient(135deg, #cce9f2 0%, #e6f5fb 55%, #f1fafc 100%)",
        backgroundColor: "transparent",
        borderColor: "rgba(26,74,102,0.10)",
      };

// A tab in the row.
const navButtonSx = (isActive) => ({
  ...navLabelSx,
  borderRadius: 0,
  px: 2,
  bgcolor: isActive ? NAV_ACTIVE : "transparent",
  "&:hover": { bgcolor: NAV_HOVER },
});

// A tab inside the dropdown. Same lettering, same tints, same square corners as
// one in the bar — because it is meant to BE one: the panel lays them out in a
// row, so what drops down is a second line of the bar rather than a list.
//
// nowrap and the auto width are what make that work: a MenuItem is built to be a
// full-width row and will happily wrap its label, which in a horizontal strip
// reads as a broken tab rather than a narrow one.
const navMenuItemSx = {
  ...navLabelSx,
  borderRadius: 0,
  px: 2,
  whiteSpace: "nowrap",
  width: "auto",
  flex: "0 0 auto",
  // The bar's own thickness. A MenuItem is ~48px by default, which read as a
  // thinner strip stuck under a thicker one; at the same height the two are one
  // continuous surface. `height` as well as minHeight because MUI sets its
  // default inside a media query, and a min alone leaves that free to win.
  minHeight: BAR_HEIGHT,
  height: BAR_HEIGHT,
  "&:hover": { bgcolor: NAV_HOVER },
  // MUI's own selected/hover colours are overridden rather than left to the
  // theme — otherwise the open page's tab would be highlighted in a different
  // blue from the one that leads to it.
  "&.Mui-selected": { bgcolor: NAV_ACTIVE },
  "&.Mui-selected:hover": { bgcolor: NAV_ACTIVE },
  // MenuItem carries a physical `text-align: left` from MUI, and this app runs
  // RTL without the stylis flip plugin.
  textAlign: "start",
};

// The strip itself. A MenuList stacks its children; this is the one declaration
// that turns the dropdown from a list into a row of tabs. Direction is left to
// the document's RTL, exactly as in the bar above, so the first shelf sits on
// the right under the tab that opened it.
const navMenuListSx = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  // No band of gradient above the first tab and below the last: each one meets
  // the panel's edge, the way a tab meets the bar's.
  py: 0,
};

const getLinksByRole = (role) => {
  if (role === roles.admin) return adminLinks;
  if (role === roles.lecturer) return lecturerLinks;
  return studentLinks;
};

const avatarInitial = (user) => user?.display_name?.[0]?.toUpperCase() || "U";

// The personal drawer is confined to the left-image column so it opens *over*
// the image only. These match the archive left-image geometry (ArchivePage):
// the image is 24vw wide, sits below the 64px navbar, and fills the rest.
const DRAWER_TOP = BAR_HEIGHT; // start below the sticky navbar
const DRAWER_WIDTH = "20.4vw"; // 85% of the image width (24vw * 0.85)

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useSelector(selectUser);
  const role = useSelector(selectUserRole);

  const links = getLinksByRole(role);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [personalAnchor, setPersonalAnchor] = useState(null);
  const personalActive = PERSONAL_SHELVES.some((shelf) => shelf.path === pathname);
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
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0, flexGrow: 1, alignSelf: "stretch" }}>
          {/* Leads the row, where the personal tabs it replaces used to sit.
              Highlighted whenever ANY of the shelves behind it is the open page,
              so the bar still says where you are once the menu is closed. */}
          <Button
            onClick={(e) => setPersonalAnchor(e.currentTarget)}
            aria-haspopup="menu"
            aria-expanded={Boolean(personalAnchor)}
            size="small"
            endIcon={<ExpandMoreIcon />}
            // The arrow's spacing used to be corrected here by hand, because
            // MUI's physical margins put it on the wrong side of the label in
            // this unflipped RTL context. That correction now lives in the
            // theme, as logical margins, for every button in the app — see
            // MuiButton in theme.js.
            sx={navButtonSx(personalActive)}
          >
            תוכן אישי
          </Button>

          {links.map((link) => (
            <Button
              key={link.label}
              component={Link}
              to={link.to}
              size="small"
              sx={navButtonSx(pathname === link.to)}
            >
              {link.label}
            </Button>
          ))}
        </Box>

        {/* The personal shelves, one click down from the bar rather than three
            tabs across it. */}
        <Menu
          anchorEl={personalAnchor}
          open={Boolean(personalAnchor)}
          onClose={() => setPersonalAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          // MenuListProps rather than slotProps.list: this is the prop Menu has
          // always forwarded to its MenuList, and the layout below is the whole
          // point of the panel — not something to leave riding on a slot name.
          MenuListProps={{ sx: navMenuListSx }}
          slotProps={{
            paper: {
              sx: (theme) => ({
                ...barSurfaceSx(theme),
                // Square, edged, and flush under the tab: the panel is the bar
                // carrying on downwards rather than a card floating near it.
                // A radius here is what made it read as a separate object.
                borderRadius: 0,
                // Longhands — see barSurfaceSx for why the `border` shorthand
                // cannot be used here without erasing the colour it sets.
                borderWidth: "1px",
                borderStyle: "solid",
              }),
            },
          }}
        >
          {PERSONAL_SHELVES.map(({ label, path, Icon }) => (
            <MenuItem
              key={path}
              component={Link}
              to={path}
              selected={pathname === path}
              onClick={() => setPersonalAnchor(null)}
              sx={navMenuItemSx}
            >
              {/* minWidth 0: MenuItem reserves a fixed icon column so that
                  stacked rows align, which in a horizontal strip is just a hole
                  between the icon and its own label. The gap is a margin-LEFT
                  because RTL puts the icon to the right of the text it labels. */}
              <ListItemIcon sx={{ minWidth: 0, ml: 1, color: "primary.main" }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              {/* The lettering has to be set on the TEXT, not only on the row:
                  ListItemText renders its own Typography, whose body1 size would
                  otherwise override anything inherited from the MenuItem. */}
              <ListItemText
                primary={label}
                primaryTypographyProps={navLabelSx}
                sx={{ my: 0, flex: "0 0 auto" }}
              />
            </MenuItem>
          ))}
        </Menu>

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

          {/* The user's own material — their notes, the lectures they liked and
              the ones they saved. Promoted above the divider because these are
              personal collections rather than places to browse, and they are the
              same three the top bar's "תוכן אישי" dropdown offers. */}
          <List>
            {PERSONAL_SHELVES.map(({ label, path, Icon }) => (
              <ListItem key={path} disablePadding>
                {/* Navigation does NOT close the drawer — it stays open until the
                    user explicitly closes it with the X button (or Esc). */}
                <ListItemButton component={Link} to={path} selected={pathname === path}>
                  <Icon fontSize="small" sx={{ color: "primary.main", ml: 1 }} />
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
