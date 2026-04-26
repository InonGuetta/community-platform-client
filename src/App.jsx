import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Navbar from "./components/layout/navbar/Navbar";
import ProtectedRoute from "./components/pages/auth/ProtectedRoute";
import SignIn from "./components/pages/auth/SignIn";
import SignUp from "./components/pages/auth/SignUp";
import ArchivePage from "./components/pages/archive/ArchivePage";
import MediaViewPage from "./components/pages/mediaView/MediaViewPage";
import SessionsPage from "./components/pages/sessions/SessionsPage";
import SessionRoom from "./components/pages/sessions/SessionRoom";
import UsersPage from "./components/pages/users/UsersPage";
import AdminDashboard from "./components/pages/admin/AdminDashboard";
import DonatePage from "./components/pages/donate/DonatePage";
import { fetchMe } from "./store/slicesAndThunks/authSlices/authGet";
import { selectUser } from "./store/selectors/authSelectors";

const AUTH_PATHS = ["/sign-in", "/sign-up"];

const theme = createTheme({
  palette: { mode: "light", primary: { main: "#1a73e8" } },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});

const App = () => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const user = useSelector(selectUser);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !user) dispatch(fetchMe());
  }, [dispatch, user]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!AUTH_PATHS.includes(pathname) && <Navbar />}
      <Routes>
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
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
