import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import CloseIcon from "@mui/icons-material/Close";
import { useDirection } from "../../../i18n/useDirection";
import { useLanguage } from "../../../i18n/useLanguage";
import { SHELL } from "../../../theme/tokens";
import { roleLabels } from "../../../utilities/constant";
import StatusBadge from "../../features/StatusBadge/StatusBadge";
import { isActive } from "../navConfig";
import { LanguageMenu } from "../LanguageSwitcher";
import { avatarInitial } from "./useAccount";
import NavLinkLabel from "./NavLinkLabel";
import SwitchMark from "./SwitchMark";

// The side drawer (design/REDESIGN_V4.md, component 3; screen 19): the only
// menu on a phone (decision 2), so it is offered below md alone — the
// hamburger that opens it is hidden from md up, and a drawer left open while
// the window widens closes itself. It opens from the side a line STARTS on
// (the right in Hebrew, D-05), full height, over a dimmed and blurred page.
//
// Its groups come from the same navConfig as the avatar menu (decision 3):
// the personal shelves and the account, the five places to browse, "תצוגת
// מנהל" and what it shows, the language, installing, "מצב כהה", signing out.
// UI_UX_FIXES 3.6: the avatar opens this same drawer on a phone, so there are
// two surfaces there (this and the dock), not three. Each destination shows its
// icon at the start, next to the word.
// Choosing anything closes it — it is a modal panel now, not the floating one
// that stayed open beside the archive's picture.
//
// Direction: the app has no RTL emotion cache, so MUI places the paper by the
// literal anchor but flips the Slide under an rtl theme. The transition is set
// explicitly to come in FROM the anchored edge.

const itemSx = {
  justifyContent: "space-between",
  gap: 2,
  py: "14px",
  px: "12px",
  borderRadius: "12px",
  fontSize: 17,
  fontWeight: 600,
  "&:hover": { bgcolor: "surface.fill2" },
};
// A destination: its icon at the start, hard against the word (UI_UX_FIXES 3.6).
const linkSx = { justifyContent: "flex-start" };
const Rule = ({ my = 1.5 }) => <Divider sx={{ my }} />;

const NavDrawer = ({ shell }) => {
  const { t } = useTranslation(["nav", "common"]);
  const { start } = useDirection();
  const { language, languages } = useLanguage();
  const [languageAnchor, setLanguageAnchor] = useState(null);
  const wide = useMediaQuery((theme) => theme.breakpoints.up("md"));
  const {
    user, role, pathname, config, adminView, darkMode, toggleColorMode, installer, install,
    drawerOpen, closeDrawer, handleLogout, runAction, pendingRoleRequests,
  } = shell;
  const currentLanguage = languages.find((l) => l.code === language);

  useEffect(() => {
    if (wide && drawerOpen) closeDrawer();
  }, [wide, drawerOpen, closeDrawer]);

  const linkItem = (item, label = t(item.labelKey), Icon = item.Icon) => {
    const active = isActive(item, pathname);
    return (
      <ListItemButton
        key={item.id}
        component={Link}
        to={item.to}
        onClick={closeDrawer}
        aria-current={active ? "page" : undefined}
        sx={[itemSx, linkSx, active && { color: "primary.main" }]}
      >
        {Icon && (
          <ListItemIcon sx={{ minWidth: 0, color: active ? "primary.main" : "text.secondary" }}>
            <Icon sx={{ fontSize: 22 }} />
          </ListItemIcon>
        )}
        <ListItemText primary={label} slotProps={{ primary: { sx: { fontSize: "inherit", fontWeight: "inherit" } } }} />
      </ListItemButton>
    );
  };

  return (
    <Drawer
      anchor={start}
      open={drawerOpen}
      onClose={closeDrawer}
      slotProps={{
        transition: { direction: start === "left" ? "right" : "left" },
        backdrop: { sx: { bgcolor: SHELL.backdrop, backdropFilter: "blur(2px)" } },
        paper: {
          sx: {
            width: 400,
            maxWidth: "100%",
            p: 3,
            boxSizing: "border-box",
            bgcolor: "background.paper",
            backgroundImage: "none",
            boxShadow: SHELL.drawerShadow,
          },
        },
      }}
    >
      <Box sx={{ position: "relative", textAlign: "center" }}>
        <IconButton
          onClick={closeDrawer}
          aria-label={t("drawer.closePanel")}
          sx={{ position: "absolute", top: 0, insetInlineStart: 0, width: 40, height: 40, bgcolor: "surface.fill", "&:hover": { bgcolor: "surface.fillHover" } }}
        >
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Avatar
          src={user?.avatar_url || undefined}
          alt=""
          sx={(theme) => ({
            width: 80,
            height: 80,
            marginInline: "auto",
            mb: 1.5,
            background: SHELL.drawerAvatar,
            color: "common.white",
            ...theme.typography.display,
            fontSize: 34,
          })}
        >
          {avatarInitial(user)}
        </Avatar>
        <Typography dir="auto" sx={{ fontWeight: 800, fontSize: 20, overflowWrap: "anywhere" }}>
          {user?.display_name || t("common:user.fallbackName")}
        </Typography>
        {user?.email && (
          <Typography dir="ltr" sx={{ fontSize: 14, color: "text.secondary", overflowWrap: "anywhere" }}>
            {user.email}
          </Typography>
        )}
        <Box sx={{ mt: 1 }}>
          <StatusBadge tone="indigo">{roleLabels[role] || t("common:user.fallbackName")}</StatusBadge>
        </Box>
      </Box>

      <Rule my={2.5} />
      <List disablePadding>{config.personal.map((item) => linkItem(item))}</List>

      <Rule />
      <List disablePadding component="nav" aria-label={t("mainNav")}>
        {config.primary.map((item) => linkItem(item))}
      </List>

      {adminView.eligible && (
        <>
          <Rule />
          <List disablePadding>
            <ListItemButton role="switch" aria-checked={adminView.enabled} onClick={adminView.toggle} sx={itemSx}>
              <span>{t("adminView")}</span>
              <SwitchMark checked={adminView.enabled} />
            </ListItemButton>
            {adminView.showAdmin && config.admin.length > 0 && (
              <Typography variant="kicker" component="p" sx={{ px: 1.5, pt: 1, color: "text.secondary" }}>
                {t("groups.admin")}
              </Typography>
            )}
            {adminView.showAdmin &&
              config.admin.map((item) =>
                item.to ? (
                  linkItem(item, item.countsRequests ? <NavLinkLabel item={item} pendingRoleRequests={pendingRoleRequests} /> : undefined)
                ) : (
                  <ListItemButton key={item.id} onClick={() => runAction(item.action)} sx={[itemSx, linkSx]}>
                    {item.Icon && (
                      <ListItemIcon sx={{ minWidth: 0, color: "text.secondary" }}>
                        <item.Icon sx={{ fontSize: 22 }} />
                      </ListItemIcon>
                    )}
                    <ListItemText primary={t(item.labelKey)} slotProps={{ primary: { sx: { fontSize: "inherit", fontWeight: "inherit" } } }} />
                  </ListItemButton>
                )
              )}
          </List>
        </>
      )}

      <Rule />
      <List disablePadding>
        <ListItemButton onClick={(e) => setLanguageAnchor(e.currentTarget)} aria-haspopup="menu" sx={itemSx}>
          <span>{t("common:language.label")}</span>
          <Box component="span" lang={currentLanguage?.code} dir={currentLanguage?.dir} sx={{ color: "text.secondary", fontSize: 15, fontWeight: 500 }}>
            {currentLanguage?.name}
          </Box>
        </ListItemButton>
        {installer.offer && (
          <ListItemButton onClick={install} sx={itemSx}>
            <span>{t("drawer.install")}</span>
          </ListItemButton>
        )}
        <ListItemButton role="switch" aria-checked={darkMode} onClick={toggleColorMode} sx={itemSx}>
          <span>{t("colorMode.toDark")}</span>
          <SwitchMark checked={darkMode} />
        </ListItemButton>
        <ListItemButton onClick={handleLogout} sx={[itemSx, { color: "surface.danger", fontWeight: 700 }]}>
          <span>{t("drawer.signOut")}</span>
        </ListItemButton>
      </List>
      <LanguageMenu anchor={languageAnchor} onClose={() => setLanguageAnchor(null)} onChosen={closeDrawer} />
    </Drawer>
  );
};

export default NavDrawer;
