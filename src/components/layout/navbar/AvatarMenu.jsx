import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import Typography from "@mui/material/Typography";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import GetAppOutlinedIcon from "@mui/icons-material/GetAppOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { useDirection } from "../../../i18n/useDirection";
import { useLanguage } from "../../../i18n/useLanguage";
import { LanguageMenu } from "../LanguageSwitcher";
import { HEADER_HEIGHT } from "../shellGeometry";
import { ACCOUNT_ITEM } from "../navConfig";
import NavLinkLabel from "./NavLinkLabel";
import SwitchMark from "./SwitchMark";

// The avatar menu (design/REDESIGN_V4.md, component 2): 272 wide, built from
// navConfig in the order the spec gives — the account's header, the personal
// shelves and the account page, "תצוגת מנהל" and the management group behind
// it, the site's language, installing, "מצב כהה", and signing out.
// Everything here is also in the drawer, from the same lists (decision 3).
//
// UI_UX_FIXES 3.5: the account page is reached once — through the header at the
// top (name and e-mail), not also as a row; every item carries the icon the
// drawer gives it; and the management items sit in one group that folds, so the
// menu stays short. The group opens by itself when the page you are on is in it.

const rowSx = { justifyContent: "space-between", gap: 2 };
const rule = <Divider sx={{ my: 0.5 }} />;
const iconSx = { minWidth: 32, color: "text.secondary" };
const MenuIcon = ({ Icon }) => (Icon ? <ListItemIcon sx={iconSx}><Icon fontSize="small" /></ListItemIcon> : null);

const AvatarMenu = ({ shell }) => {
  const { t } = useTranslation(["nav", "common"]);
  const { end } = useDirection();
  const { language, languages } = useLanguage();
  const [languageAnchor, setLanguageAnchor] = useState(null);
  const [adminFolded, setAdminFolded] = useState(true);
  const {
    user, pathname, config, adminView, darkMode, toggleColorMode, installer, install,
    menuAnchor, closeMenu, handleLogout, runAction, pendingRoleRequests,
  } = shell;
  const currentLanguage = languages.find((l) => l.code === language);
  const adminOpen = !adminFolded || config.admin.some((item) => item.to === pathname);

  return (
    <>
      <Menu
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        // Flush to the screen's end edge, directly under the header: anchored to
        // that point of the viewport, not to the avatar, which sits inside the
        // header's padding. marginThreshold 0 stops MUI keeping 16px from it.
        anchorReference="anchorPosition"
        anchorPosition={{ top: HEADER_HEIGHT, left: end === "left" ? 0 : document.documentElement.clientWidth }}
        marginThreshold={0}
        transformOrigin={{ vertical: "top", horizontal: end }}
        slotProps={{
          paper: {
            sx: {
              width: 272,
              maxWidth: "100vw",
              maxHeight: `calc(100vh - ${HEADER_HEIGHT}px)`,
              overflowY: "auto",
              // The edge side meets the screen, so those corners are square.
              borderStartEndRadius: 0,
              borderEndEndRadius: 0,
            },
          },
        }}
      >
        {/* Who is signed in — and the way to their account page. */}
        <MenuItem
          component={Link}
          to="/profile"
          onClick={closeMenu}
          sx={{ flexDirection: "column", alignItems: "flex-start", gap: 0.25, py: 1.5, mb: 0.5, borderBottom: 1, borderColor: "divider", borderRadius: 0 }}
        >
          <Typography component="span" dir="auto" sx={{ fontWeight: 700, fontSize: 15, maxWidth: "100%" }} noWrap>
            {user?.display_name || t("common:user.fallbackName")}
          </Typography>
          {user?.email && (
            <Typography component="span" dir="ltr" sx={{ fontSize: 12, color: "text.secondary", maxWidth: "100%" }} noWrap>
              {user.email}
            </Typography>
          )}
        </MenuItem>

        {config.personal
          .filter((item) => item.id !== ACCOUNT_ITEM.id)
          .map((item) => (
            <MenuItem key={item.id} component={Link} to={item.to} onClick={closeMenu} selected={pathname === item.to}>
              <MenuIcon Icon={item.Icon} />
              {t(item.labelKey)}
            </MenuItem>
          ))}

        {adminView.eligible && rule}
        {adminView.eligible && (
          <MenuItem role="switch" aria-checked={adminView.enabled} onClick={adminView.toggle} sx={rowSx}>
            <Box component="span" sx={{ display: "flex", alignItems: "center", fontWeight: 600 }}>
              <MenuIcon Icon={AdminPanelSettingsOutlinedIcon} />
              {t("adminView")}
            </Box>
            <SwitchMark checked={adminView.enabled} />
          </MenuItem>
        )}
        {adminView.showAdmin && config.admin.length > 0 && (
          <MenuItem
            onClick={() => setAdminFolded((folded) => !folded)}
            aria-expanded={adminOpen}
            sx={{ ...rowSx, pt: 0.75 }}
          >
            <Typography variant="kicker" component="span" sx={{ color: "text.secondary" }}>
              {t("groups.admin")}
            </Typography>
            {adminOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </MenuItem>
        )}
        {adminView.showAdmin &&
          adminOpen &&
          config.admin.map((item) =>
            item.to ? (
              <MenuItem key={item.id} component={Link} to={item.to} onClick={closeMenu} selected={pathname === item.to}>
                <MenuIcon Icon={item.Icon} />
                {item.countsRequests ? <NavLinkLabel item={item} pendingRoleRequests={pendingRoleRequests} /> : t(item.labelKey)}
              </MenuItem>
            ) : (
              <MenuItem key={item.id} onClick={() => runAction(item.action)}>
                <MenuIcon Icon={item.Icon} />
                {t(item.labelKey)}
              </MenuItem>
            )
          )}

        {rule}
        <MenuItem onClick={(e) => setLanguageAnchor(e.currentTarget)} aria-haspopup="menu" sx={rowSx}>
          <Box component="span" sx={{ display: "flex", alignItems: "center" }}>
            <MenuIcon Icon={LanguageOutlinedIcon} />
            {t("common:language.label")}
          </Box>
          <Box component="span" lang={currentLanguage?.code} dir={currentLanguage?.dir} sx={{ color: "text.secondary", fontSize: 13 }}>
            {currentLanguage?.name}
          </Box>
        </MenuItem>
        {installer.offer && (
          <MenuItem onClick={install}>
            <MenuIcon Icon={GetAppOutlinedIcon} />
            {t("drawer.install")}
          </MenuItem>
        )}
        <MenuItem role="switch" aria-checked={darkMode} onClick={toggleColorMode} sx={rowSx}>
          <Box component="span" sx={{ display: "flex", alignItems: "center" }}>
            <MenuIcon Icon={DarkModeOutlinedIcon} />
            {t("colorMode.toDark")}
          </Box>
          <SwitchMark checked={darkMode} />
        </MenuItem>

        {rule}
        <MenuItem onClick={handleLogout} sx={{ color: "surface.danger", fontWeight: 600 }}>
          <MenuIcon Icon={LogoutOutlinedIcon} />
          {t("drawer.signOut")}
        </MenuItem>
      </Menu>
      <LanguageMenu anchor={languageAnchor} onClose={() => setLanguageAnchor(null)} onChosen={closeMenu} />
    </>
  );
};

export default AvatarMenu;
