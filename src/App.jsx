import { useEffect, useState, useMemo } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import { buildTheme } from "./theme/theme";
import { ColorModeContext } from "./theme/colorMode";
import Navbar from "./components/layout/navbar/Navbar";
import PendingRoleBanner from "./components/layout/navbar/PendingRoleBanner";
import GlobalSnackbar from "./components/features/Notification/GlobalSnackbar";
import ProtectedRoute from "./components/pages/auth/ProtectedRoute";
import SignIn from "./components/pages/auth/SignIn";
import SignUp from "./components/pages/auth/SignUp";
import GoogleCallback from "./components/pages/auth/GoogleCallback";
import ForgotPassword from "./components/pages/auth/ForgotPassword";
import ResetPassword from "./components/pages/auth/ResetPassword";
import VerifyEmail from "./components/pages/auth/VerifyEmail";
import ProfilePage from "./components/pages/profile/ProfilePage";
import ArchivePage from "./components/pages/archive/ArchivePage";
import MediaViewPage from "./components/pages/mediaView/MediaViewPage";
import SessionsPage from "./components/pages/sessions/SessionsPage";
import SessionRoom from "./components/pages/sessions/SessionRoom";
import UsersPage from "./components/pages/users/UsersPage";
import CoursesPage from "./components/pages/courses/CoursesPage";
import MyCoursesPage from "./components/pages/courses/MyCoursesPage";
import AdminDashboard from "./components/pages/admin/AdminDashboard";
import DonatePage from "./components/pages/donate/DonatePage";
import NotebookPage from "./components/pages/notebook/NotebookPage";
import CollectionPage from "./components/pages/personal/CollectionPage";
import PlaylistPage from "./components/pages/personal/PlaylistPage";
import { NOTEBOOK_SHELF, COLLECTION_SHELVES, SAVED_LIST_ROUTE } from "./components/pages/personal/personalShelves";
import { fetchMe } from "./store/slicesAndThunks/authSlices/authGet";

// Pages that render WITHOUT the navigation bar: they are reached by someone who
// is not signed in, and the recovery three by someone who by definition cannot
// be — a nav bar full of links they would be redirected away from is noise on
// the one screen that has to be simple.
const AUTH_PATHS = [
  "/sign-in",
  "/sign-up",
  "/auth/google/callback",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

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
        {/* Directly under the bar, on every signed-in page, and outside the
            page-transition wrapper so it does not slide in and out on every
            navigation — it is a standing state, not page content. */}
        {!AUTH_PATHS.includes(pathname) && (
          <>
            <Navbar />
            <PendingRoleBanner />
          </>
        )}
        <PageTransition pathname={pathname}>
          <Routes location={location}>
            <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          {/* Recovery, unprotected by necessity: whoever needs these cannot sign
              in. The token in the URL is the credential. */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/archive" replace />} />
          <Route path="/archive" element={<ProtectedRoute><ArchivePage /></ProtectedRoute>} />
          <Route path="/media/:id" element={<ProtectedRoute><MediaViewPage /></ProtectedRoute>} />
          <Route path="/sessions" element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />
          {/* By id, not by room token. The token is a credential the server
              hands out only to a caller it has decided may enter — putting it in
              the URL made it a shared secret that was also published in the
              sessions list and kept in browser history. */}
          <Route path="/sessions/:id" element={<ProtectedRoute><SessionRoom /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute allowedRoles={["admin"]}><UsersPage /></ProtectedRoute>} />
          {/* Lecturers manage their own courses here, so this is not admin-only —
              the page itself hides the controls for courses they do not teach. */}
          <Route path="/courses" element={<ProtectedRoute allowedRoles={["lecturer", "admin"]}><CoursesPage /></ProtectedRoute>} />
          {/* The student's side of the same feature, and a separate route rather
              than a mode of the one above: that page manages courses, this one
              answers "what am I in". Open to everyone — a lecturer may also be
              enrolled in someone else's course. */}
          <Route path="/my-courses" element={<ProtectedRoute><MyCoursesPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/donate" element={<ProtectedRoute><DonatePage /></ProtectedRoute>} />
          {/* The personal shelves take their paths from personalShelves.js, the
              same file the navigation builds its links from — so a path can no
              longer be changed on one side only, which used to leave the link
              falling through to the "*" catch-all with no error anywhere. */}
          <Route path={NOTEBOOK_SHELF.path} element={<ProtectedRoute><NotebookPage /></ProtectedRoute>} />
          {COLLECTION_SHELVES.map((shelf) => (
            <Route
              key={shelf.path}
              path={shelf.path}
              element={<ProtectedRoute><CollectionPage shelf={shelf} /></ProtectedRoute>}
            />
          ))}
          {/* One saved list, opened from the cards on the saved shelf. Its path
              is built from that shelf's own, in personalShelves.js. */}
          <Route path={SAVED_LIST_ROUTE} element={<ProtectedRoute><PlaylistPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/archive" replace />} />
        </Routes>
        </PageTransition>
        <GlobalSnackbar />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default App;
