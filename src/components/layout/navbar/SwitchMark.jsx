import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";

// The picture of a switch inside a row that IS the switch: the avatar menu's
// and the drawer's "תצוגת מנהל" and "מצב כהה" rows carry role="switch" and
// aria-checked themselves, so the whole row is one target for a finger, a
// click and a screen reader. This is only what it looks like — hidden from
// assistive technology and out of the tab order.
const SwitchMark = ({ checked }) => (
  <Box component="span" aria-hidden sx={{ display: "inline-flex", pointerEvents: "none", flexShrink: 0 }}>
    <Switch checked={checked} tabIndex={-1} inputProps={{ tabIndex: -1, readOnly: true, "aria-hidden": true }} sx={{ margin: 0 }} />
  </Box>
);

export default SwitchMark;
