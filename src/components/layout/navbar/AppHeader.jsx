import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import MenuIcon from "@mui/icons-material/Menu";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import FullscreenExitRoundedIcon from "@mui/icons-material/FullscreenExitRounded";
import Tooltip from "@mui/material/Tooltip";
import { useFullscreen } from "../../../utilities/useFullscreen";
import { RADIUS, SHELL } from "../../../theme/tokens";
import { HEADER_HEIGHT } from "../shellGeometry";
import { isActive } from "../navConfig";
import LanguageSwitcher from "../LanguageSwitcher";
import NotificationBell from "./NotificationBell";
import InstallHelpDialog from "./InstallHelpDialog";
import AvatarMenu from "./AvatarMenu";
import NavDrawer from "./NavDrawer";
import useAppShell from "./useAppShell";
import { avatarInitial } from "./useAccount";
import { BrandWaveIcon } from "./dockIcons";

// The top header (design/REDESIGN_V4.md, component 1): sticky, glass, 60px
// (it was 48 — widened at the owner's request). At the start the brand; in the
// middle of the bar the places everyone browses, "ארכיון" to "תרומה", centred
// on the bar itself rather than pushed against the brand; at the end the full
// screen button, the bell and the avatar, which opens the avatar menu. Below md the five links
// give way to a hamburger that opens the side drawer — the only menu on a phone
// (decision 2). Everything else the old bar held (the personal shelves, the
// management links, the language, the colour mode, installing, signing out) is
// in the avatar menu and the drawer, both built from navConfig.
//
// variant="minimal": the brand and the language only — the sign-in pages
// (decision 5, rendered by AuthLayout) and anyone not signed in.

const Frame = ({ children, centred = false }) => (
  <Box
    component="header"
    sx={(theme) => ({
      position: "sticky",
      top: 0,
      zIndex: theme.zIndex.appBar,
      height: HEADER_HEIGHT,
      bgcolor: "surface.glass",
      backdropFilter: "saturate(180%) blur(20px)",
      WebkitBackdropFilter: "saturate(180%) blur(20px)",
      borderBottom: `1px solid ${SHELL.headerEdge[theme.palette.mode]}`,
    })}
  >
    <Box
      sx={{
        // Not capped at the content's width: the avatar and bell sit at the
        // screen's edge on a wide monitor, the brand at the other (UI_UX_FIXES 1.2).
        // The pages below keep their own 1180.
        maxWidth: "none",
        height: "100%",
        paddingInline: { xs: 1.5, md: 2 },
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        // Three columns from md up when the bar has a middle: the two sides take
        // equal shares, so the middle sits at the bar's true centre whatever the
        // brand's and the buttons' widths.
        ...(centred && {
          display: { xs: "flex", md: "grid" },
          gridTemplateColumns: { md: "1fr auto 1fr" },
        }),
      }}
    >
      {children}
    </Box>
  </Box>
);

const Brand = () => {
  const { t } = useTranslation("common");
  return (
    <Box
      component={Link}
      to="/archive"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        minWidth: 0,
        color: "text.primary",
        textDecoration: "none",
        fontWeight: 800,
        fontSize: 17,
        letterSpacing: "-0.01em",
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 24,
          height: 24,
          flexShrink: 0,
          borderRadius: "7px",
          bgcolor: "text.primary",
          color: "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <BrandWaveIcon sx={{ fontSize: 14 }} />
      </Box>
      <Box component="span" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {t("appName")}
      </Box>
    </Box>
  );
};

const MinimalHeader = () => (
  <Frame>
    <Brand />
    <LanguageSwitcher color="surface.ink2" />
  </Frame>
);

// While the first "who am I" is in flight (UI_UX_FIXES 3.2). The session is an
// httpOnly cookie the page cannot read, so nothing client-side says whether one
// exists; showing the guest header first and swapping it was the flicker. Every
// page with this header needs a sign-in, so the neutral choice is the signed-in
// shape: the brand, and grey placeholders where the bell and the avatar go.
const PendingHeader = () => (
  <Frame>
    <Brand />
    <Box aria-hidden sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Skeleton variant="circular" width={28} height={28} />
      <Skeleton variant="circular" width={28} height={28} />
    </Box>
  </Frame>
);

const PrimaryLinks = ({ links, pathname }) => {
  const { t } = useTranslation("nav");
  return (
    <Box component="nav" aria-label={t("mainNav")} sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", justifyContent: "center", gap: { md: 3, lg: 4 } }}>
      {links.map((link) => {
        const active = isActive(link, pathname);
        return (
          <Box
            key={link.id}
            component={Link}
            to={link.to}
            aria-current={active ? "page" : undefined}
            sx={{
              fontSize: 15,
              whiteSpace: "nowrap",
              textDecoration: "none",
              color: active ? "text.primary" : "surface.ink2",
              fontWeight: active ? 700 : 400,
              transition: "color .2s",
              "&:hover": { color: "text.primary" },
            }}
          >
            {t(link.labelKey)}
          </Box>
        );
      })}
    </Box>
  );
};

// The avatar and its chevron: opens the avatar menu. A small dot when role
// requests are waiting and the admin group is on (D-08) — the number is in
// the button's name.
const AvatarButton = ({ shell }) => {
  const { t } = useTranslation("nav");
  const { user, menuAnchor, openMenu, pendingRoleRequests } = shell;
  const label = pendingRoleRequests > 0 ? t("accountMenu.openPending", { count: pendingRoleRequests }) : t("accountMenu.open");
  return (
    <ButtonBase
      onClick={openMenu}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={Boolean(menuAnchor)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        borderRadius: `${RADIUS.pill}px`,
        paddingBlock: "4px",
        paddingInlineStart: "4px",
        paddingInlineEnd: "8px",
        color: "surface.ink2",
        transition: "background-color .2s",
        "&:hover": { bgcolor: "surface.fill" },
      }}
    >
      <Box sx={{ position: "relative", display: "flex" }}>
        <Avatar
          src={user?.avatar_url || undefined}
          alt=""
          sx={{ width: 28, height: 28, bgcolor: "primary.main", color: "primary.contrastText", fontSize: 12, fontWeight: 700 }}
        >
          {avatarInitial(user)}
        </Avatar>
        {pendingRoleRequests > 0 && (
          <Box
            component="span"
            aria-hidden
            sx={{
              position: "absolute",
              top: -1,
              insetInlineEnd: -1,
              width: 10,
              height: 10,
              borderRadius: "50%",
              bgcolor: "surface.danger",
              border: "2px solid",
              borderColor: "background.default",
            }}
          />
        )}
      </Box>
      <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
    </ButtonBase>
  );
};

// What F11 does, as a button beside the bell. Not drawn where the browser
// offers no full screen (an iPhone), rather than as a button that does nothing.
const FullscreenButton = () => {
  const { t } = useTranslation("nav");
  const { supported, active, toggle } = useFullscreen();
  if (!supported) return null;
  const label = active ? t("fullscreen.exit") : t("fullscreen.enter");
  return (
    <Tooltip title={label}>
      <IconButton
        onClick={toggle}
        aria-label={label}
        aria-pressed={active}
        sx={{ display: { xs: "none", md: "inline-flex" }, color: "surface.ink2", "&:hover": { color: "text.primary" } }}
      >
        {active ? <FullscreenExitRoundedIcon sx={{ fontSize: 22 }} /> : <FullscreenRoundedIcon sx={{ fontSize: 22 }} />}
      </IconButton>
    </Tooltip>
  );
};

const SignedInHeader = () => {
  const { t } = useTranslation("nav");
  const shell = useAppShell();
  const { user, initialized, pathname, config, bell, installer, drawerOpen, openDrawer } = shell;

  // Before fetchMe has answered: a neutral skeleton, not the guest header.
  if (!user && !initialized) return <PendingHeader />;
  // For anyone signed out, only the brand and the language (component 1:
  // "משתמש לא מחובר").
  if (!user) return <MinimalHeader />;

  return (
    <>
      <Frame centred>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <IconButton
            onClick={openDrawer}
            aria-label={drawerOpen ? t("drawer.close") : t("drawer.open")}
            aria-expanded={drawerOpen}
            sx={{ display: { xs: "inline-flex", md: "none" }, color: "text.primary", marginInlineStart: -1 }}
          >
            <MenuIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Brand />
        </Box>
        <PrimaryLinks links={config.primary} pathname={pathname} />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1.5, flexShrink: 0 }}>
          <FullscreenButton />
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
          <AvatarButton shell={shell} />
        </Box>
      </Frame>
      <AvatarMenu shell={shell} />
      <NavDrawer shell={shell} />
      <InstallHelpDialog open={installer.iosHelpOpen} onClose={installer.closeIosHelp} />
    </>
  );
};

const AppHeader = ({ variant = "full" }) => (variant === "minimal" ? <MinimalHeader /> : <SignedInHeader />);

export default AppHeader;
