import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import { logout } from "../../../store/slicesAndThunks/authSlices/authPost";
import { selectUser, selectUserRole } from "../../../store/selectors/authSelectors";
import { roles } from "../../../utilities/constant";

const studentLinks = [
  { label: "Archive", to: "/archive" },
  { label: "Bookmarks", to: "/bookmarks" },
  { label: "Sessions", to: "/sessions" },
  { label: "Donate", to: "/donate" },
];

const lecturerLinks = [
  ...studentLinks,
  { label: "Upload", to: "/archive", action: "upload" },
];

const adminLinks = [
  ...studentLinks,
  { label: "Users", to: "/users" },
  { label: "Admin", to: "/admin" },
];

const getLinksByRole = (role) => {
  if (role === roles.admin) return adminLinks;
  if (role === roles.lecturer) return lecturerLinks;
  return studentLinks;
};

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useSelector(selectUser);
  const role = useSelector(selectUserRole);

  const links = getLinksByRole(role);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/sign-in");
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: "linear-gradient(135deg, #cce9f2 0%, #e6f5fb 55%, #f1fafc 100%)",
        borderBottom: "1px solid rgba(26,74,102,0.10)",
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: 64 }}>
        <Typography variant="h6" fontWeight={800} color="primary" sx={{ mr: 3, flexShrink: 0, letterSpacing: 0.2 }}>
          Community Platform
        </Typography>

        <Box sx={{ display: "flex", gap: 0, flexGrow: 1, alignSelf: "stretch" }}>
          {links.map((link) => {
            const isActive = pathname === link.to;
            return (
              <Button
                key={link.label}
                component={Link}
                to={link.to}
                size="small"
                sx={{
                  color: "primary.main",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  borderRadius: 0,
                  px: 2,
                  bgcolor: isActive ? "rgba(26,74,102,0.12)" : "transparent",
                  "&:hover": { bgcolor: "rgba(26,74,102,0.08)" },
                }}
              >
                {link.label}
              </Button>
            );
          })}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: "transparent", color: "primary.main", border: "1.5px solid", borderColor: "primary.main", fontSize: 14, fontWeight: 700 }}>
            {user?.display_name?.[0]?.toUpperCase() || "U"}
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
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
