import { useEffect, useState, useMemo } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import { buildTheme } from "./theme/theme";
import { ColorModeContext } from "./theme/colorMode";
import Navbar from "./components/layout/navbar/Navbar";
import GlobalSnackbar from "./components/features/Notification/GlobalSnackbar";
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
import NotebookPage from "./components/pages/notebook/NotebookPage";
import { fetchMe } from "./store/slicesAndThunks/authSlices/authGet";

const AUTH_PATHS = ["/sign-in", "/sign-up", "/auth/google/callback"];

// Mac-style page transition: each time the route changes, the new page slides
// in gradually from the side with a fade. Keying off the pathname remounts this
// wrapper so the CSS animation replays on every navigation.
const PageTransition = ({ pathname, children }) => (
  <Box
    key={pathname}
    sx={{
      // Flowing but snappy: shorter duration, blur clears early so content is
      // crisp for most of the motion, and a soft decelerating settle at the end.
      animation: "pageSlide 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
      willChange: "opacity, transform, filter",
      "@keyframes pageSlide": {
        // RTL: enter from the leading (left) edge to mirror the LTR feel.
        "0%": { opacity: 0, transform: "translateX(-24px) scale(0.99)", filter: "blur(4px)" },
        "45%": { opacity: 1, filter: "blur(0px)" },
        "100%": { opacity: 1, transform: "translateX(0) scale(1)", filter: "blur(0px)" },
      },
    }}
  >
    {children}
  </Box>
);

const App = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { pathname } = location;

  // Opt-in dark mode: defaults to light (existing experience unchanged) and only
  // flips when the user toggles it. Persisted so the choice survives reloads.
  const [mode, setMode] = useState(() =>
    localStorage.getItem("colorMode") === "dark" ? "dark" : "light"
  );
  const theme = useMemo(() => buildTheme(mode), [mode]);
  const colorMode = useMemo(
    () => ({
      mode,
      toggle: () =>
        setMode((prev) => {
          const next = prev === "dark" ? "light" : "dark";
          localStorage.setItem("colorMode", next);
          return next;
        }),
    }),
    [mode]
  );

  useEffect(() => {
    // The httpOnly cookie isn't readable from JS, so we always ask the server who we are
    // on first mount. fetchMe.rejected flips `initialized` true so unauth pages still render.
    dispatch(fetchMe());
  }, [dispatch]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {!AUTH_PATHS.includes(pathname) && <Navbar />}
        <PageTransition pathname={pathname}>
          <Routes location={location}>
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
          <Route path="/notebook" element={<ProtectedRoute><NotebookPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/archive" replace />} />
        </Routes>
        </PageTransition>
        <GlobalSnackbar />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default App;
