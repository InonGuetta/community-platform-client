import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";

// REG-11: the admin's "משתמשים" item carries how many role requests are
// waiting behind it, from the same poll as the bell. Only the item navConfig
// marks `countsRequests`, only when the number is known (the server sends it
// to admins alone) and above zero.
//
// An inline pill after the word rather than a Badge over it: a Badge is
// positioned against the corner of what it wraps, and on a text row it landed
// across the label itself.
// An item carries a key into the "nav" namespace (navConfig.js), not words.
const NavLinkLabel = ({ item, pendingRoleRequests }) => {
  const { t } = useTranslation("nav");
  const label = t(item.labelKey);
  return item.countsRequests && pendingRoleRequests > 0 ? (
    <Box
      component="span"
      aria-label={t("pendingRequests", { label, count: pendingRoleRequests })}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
    >
      {label}
      <Box
        component="span"
        aria-hidden
        sx={{
          minWidth: 18, height: 18, px: 0.5, borderRadius: 9,
          bgcolor: "surface.danger", color: "common.white",
          fontSize: 11, fontWeight: 700, lineHeight: "18px", textAlign: "center",
        }}
      >
        {pendingRoleRequests}
      </Box>
    </Box>
  ) : (
    label
  );
};

export default NavLinkLabel;
