import { Link } from "react-router-dom";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { navButtonSx } from "./navStyles";
import NavLinkLabel from "./NavLinkLabel";
import { useTranslation } from "react-i18next";

// The bar's row of tabs, from md up: "תוכן אישי" first, which opens the
// personal menu (PersonalMenu), then the role's links (navLinks.js).
const NavLinksBar = ({ links, pathname, personalActive, personalAnchor, setPersonalAnchor, pendingRoleRequests }) => {
  const { t } = useTranslation("nav");
  return (
  // minWidth 0 and overflowX: the row is as wide as its language makes it —
  // French and Spanish labels run half again as long as Hebrew — and when it
  // does not fit, IT scrolls, rather than pushing the bell, the language and
  // the account off the edge of the bar.
  <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0, flexGrow: 1, alignSelf: "stretch", minWidth: 0, overflowX: "auto", scrollbarWidth: "none" }}>
    {/* Leads the row, where the personal tabs it replaces used to sit.
        Highlighted whenever ANY of the shelves behind it is the open page,
        so the bar still says where you are once the menu is closed. */}
    <Button
      onClick={(e) => setPersonalAnchor(e.currentTarget)}
      aria-haspopup="menu"
      aria-expanded={Boolean(personalAnchor)}
      size="small"
      endIcon={<ExpandMoreIcon />}
      // The arrow's spacing is not set here: MUI's physical margins put it
      // on the wrong side of the label in this unflipped RTL context, and
      // the theme corrects that, as logical margins, for every button in
      // the app — see MuiButton in theme.js.
      sx={navButtonSx(personalActive)}
    >
      {t("personal")}
    </Button>

    {links.map((link) => (
      <Button
        key={link.to}
        component={Link}
        to={link.to}
        size="small"
        sx={navButtonSx(pathname === link.to)}
      >
        <NavLinkLabel link={link} pendingRoleRequests={pendingRoleRequests} />
      </Button>
    ))}
  </Box>
  );
};

export default NavLinksBar;
