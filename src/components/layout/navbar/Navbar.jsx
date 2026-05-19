import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
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
  const user = useSelector(selectUser);
  const role = useSelector(selectUserRole);

  const links = getLinksByRole(role);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/sign-in");
  };

  return (
    <AppBar position="sticky" elevation={1} sx={{ bgcolor: "background.paper" }}>
      <Toolbar sx={{ gap: 1 }}>
        <Typography variant="h6" fontWeight={700} color="primary" sx={{ mr: 2, flexShrink: 0 }}>
          Community Platform
        </Typography>

        <Box sx={{ display: "flex", gap: 0.5, flexGrow: 1 }}>
          {links.map((link) => (
            <Button key={link.label} component={Link} to={link.to} size="small" sx={{ color: "text.primary" }}>
              {link.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 14 }}>
            {user?.display_name?.[0]?.toUpperCase() || "U"}
          </Avatar>
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
            {user?.display_name}
          </Typography>
          <Button size="small" variant="outlined" onClick={handleLogout} color="error">
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
