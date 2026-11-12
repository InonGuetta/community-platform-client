import Box from "@mui/material/Box";

// REG-11: the admin's "משתמשים" link carries how many role requests are
// waiting behind it, from the same poll as the bell. Only that link, only when
// the number is known (the server sends it to admins alone) and above zero.
//
// An inline pill after the word rather than a Badge over it: a Badge is
// positioned against the corner of what it wraps, and on a text link in this
// bar it landed across the label itself.
const NavLinkLabel = ({ link, pendingRoleRequests }) =>
  link.to === "/users" && pendingRoleRequests > 0 ? (
    <Box
      component="span"
      aria-label={`${link.label}, ${pendingRoleRequests} בקשות ממתינות`}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
    >
      {link.label}
      <Box
        component="span"
        aria-hidden
        sx={{
          minWidth: 18, height: 18, px: 0.5, borderRadius: 9,
          bgcolor: "error.main", color: "error.contrastText",
          fontSize: 11, fontWeight: 700, lineHeight: "18px", textAlign: "center",
        }}
      >
        {pendingRoleRequests}
      </Box>
    </Box>
  ) : (
    link.label
  );

export default NavLinkLabel;
