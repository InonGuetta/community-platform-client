import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Navbar from "./components/layout/navbar/Navbar";
import ProtectedRoute from "./components/pages/auth/ProtectedRoute";
import SignIn from "./components/pages/auth/SignIn";
import SignUp from "./components/pages/auth/SignUp";
import GoogleCallback from "./components/pages/auth/GoogleCallback";
import ArchivePage from "./components/pages/archive/ArchivePage";
import MediaViewPage from "./components/pages/mediaView/MediaViewPage";
import SessionsPage from "./components/pages/sessions/SessionsPage";
import SessionRoom from "./components/pages/sessions/SessionRoom";
import UsersPage from "./components/pages/users/UsersPage";
import AdminDashboard from "./components/pages/admin/AdminDashboard";
import DonatePage from "./components/pages/donate/DonatePage";
import { fetchMe } from "./store/slicesAndThunks/authSlices/authGet";

const AUTH_PATHS = ["/sign-in", "/sign-up", "/auth/google/callback"];

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1a4a66" },   // navy — logo, headings, nav links
    secondary: { main: "#17a2c4" },  // teal — upload button, accents
    background: { default: "#f3f5f7" },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});

const App = () => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();

  useEffect(() => {
    // The httpOnly cookie isn't readable from JS, so we always ask the server who we are
    // on first mount. fetchMe.rejected flips `initialized` true so unauth pages still render.
    dispatch(fetchMe());
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!AUTH_PATHS.includes(pathname) && <Navbar />}
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/" element={<Navigate to="/archive" replace />} />
        <Route path="/archive" element={<ProtectedRoute><ArchivePage /></ProtectedRoute>} />
        <Route path="/media/:id" element={<ProtectedRoute><MediaViewPage /></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />
        <Route path="/sessions/:roomToken" element={<ProtectedRoute><SessionRoom /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><UsersPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/donate" element={<ProtectedRoute><DonatePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/archive" replace />} />
      </Routes>
    </ThemeProvider>
  );
};

export default App;
