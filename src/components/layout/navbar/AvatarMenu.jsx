import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useDirection, menuOrigins } from "../../../i18n/useDirection";
import { useLanguage } from "../../../i18n/useLanguage";
import { LanguageMenu } from "../LanguageSwitcher";
import NavLinkLabel from "./NavLinkLabel";
import SwitchMark from "./SwitchMark";

// The avatar menu (design/REDESIGN_V4.md, component 2): 272 wide, built from
// navConfig in the order the spec gives — the account's header, the personal
// shelves and the account page, "תצוגת מנהל" and the management group behind
// it, the site's language, installing, "מצב כהה", and signing out.
// Everything here is also in the drawer, from the same lists (decision 3).

const rowSx = { justifyContent: "space-between", gap: 2 };
const rule = <Divider sx={{ my: 0.5 }} />;

const AvatarMenu = ({ shell }) => {
  const { t } = useTranslation(["nav", "common"]);
  const { end } = useDirection();
  const { language, languages } = useLanguage();
  const [languageAnchor, setLanguageAnchor] = useState(null);
  const {
    user, pathname, config, adminView, darkMode, toggleColorMode, installer, install,
    menuAnchor, closeMenu, handleLogout, runAction, pendingRoleRequests,
  } = shell;
  const currentLanguage = languages.find((l) => l.code === language);

  return (
    <>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        {...menuOrigins(end)}
        slotProps={{ paper: { sx: { width: 272, maxWidth: "calc(100vw - 24px)", maxHeight: "calc(100vh - 64px)", overflowY: "auto", mt: 0.5 } } }}
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

        {config.personal.map((item) => (
          <MenuItem key={item.id} component={Link} to={item.to} onClick={closeMenu} selected={pathname === item.to}>
            {t(item.labelKey)}
          </MenuItem>
        ))}

        {adminView.eligible && rule}
        {adminView.eligible && (
          <MenuItem role="switch" aria-checked={adminView.enabled} onClick={adminView.toggle} sx={rowSx}>
            <Box component="span" sx={{ fontWeight: 600 }}>{t("adminView")}</Box>
            <SwitchMark checked={adminView.enabled} />
          </MenuItem>
        )}
        {adminView.showAdmin && config.admin.length > 0 && (
          <Typography variant="kicker" component="li" role="presentation" sx={{ display: "block", px: 1.5, pt: 0.5, pb: 0.5, color: "text.secondary" }}>
            {t("groups.admin")}
          </Typography>
        )}
        {adminView.showAdmin &&
          config.admin.map((item) =>
            item.to ? (
              <MenuItem key={item.id} component={Link} to={item.to} onClick={closeMenu} selected={pathname === item.to}>
                {item.countsRequests ? <NavLinkLabel item={item} pendingRoleRequests={pendingRoleRequests} /> : t(item.labelKey)}
              </MenuItem>
            ) : (
              <MenuItem key={item.id} onClick={() => runAction(item.action)}>
                {t(item.labelKey)}
              </MenuItem>
            )
          )}

        {rule}
        <MenuItem onClick={(e) => setLanguageAnchor(e.currentTarget)} aria-haspopup="menu" sx={rowSx}>
          <span>{t("common:language.label")}</span>
          <Box component="span" lang={currentLanguage?.code} dir={currentLanguage?.dir} sx={{ color: "text.secondary", fontSize: 13 }}>
            {currentLanguage?.name}
          </Box>
        </MenuItem>
        {installer.offer && <MenuItem onClick={install}>{t("drawer.install")}</MenuItem>}
        <MenuItem role="switch" aria-checked={darkMode} onClick={toggleColorMode} sx={rowSx}>
          <span>{t("colorMode.toDark")}</span>
          <SwitchMark checked={darkMode} />
        </MenuItem>

        {rule}
        <MenuItem onClick={handleLogout} sx={{ color: "surface.danger", fontWeight: 600 }}>
          {t("drawer.signOut")}
        </MenuItem>
      </Menu>
      <LanguageMenu anchor={languageAnchor} onClose={() => setLanguageAnchor(null)} onChosen={closeMenu} />
    </>
  );
};

export default AvatarMenu;
