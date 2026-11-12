import { Link } from "react-router-dom";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { PERSONAL_SHELVES } from "../personalShelves";
import { barSurfaceSx, navLabelSx, navMenuItemSx, navMenuListSx } from "./navStyles";

// "תוכן אישי": the personal shelves (personalShelves.js) in a panel that
// hangs off the bar as a second row of its tabs. Opened from NavLinksBar.
const PersonalMenu = ({ personalAnchor, setPersonalAnchor, pathname }) => (
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
    {PERSONAL_SHELVES.map(({ label, path, Icon, iconColour }) => (
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
        <ListItemIcon sx={{ minWidth: 0, ml: 1, color: iconColour || "primary.main" }}>
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
);

export default PersonalMenu;
