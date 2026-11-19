import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import { buildTheme } from "../../../theme/theme";
import { useLanguage } from "../../../i18n/useLanguage";
import AppHeader from "../../layout/navbar/AppHeader";

// Auth is an always-light landing.
// Forcing the light theme here keeps it consistent even when the user has dark
// mode enabled elsewhere (e.g. MUI's own Alert/inputs won't render dark on the
// light glass card). One per direction, each built the first time it is
// needed and kept, so moving between the auth pages builds nothing.
const lightThemes = {};
const lightThemeFor = (direction) => (lightThemes[direction] ??= buildTheme("light", direction));

const AuthLayout = ({ title, children }) => {
  const { direction } = useLanguage();
  const lightTheme = lightThemeFor(direction);
  return (
  <ThemeProvider theme={lightTheme}>
  {/* The minimal header — the brand and the language (decision 5; D-11) — and
      the card centred on the page's own background below it. The picture and
      the beige washes that were behind the card are gone (stage 2); the card
      itself is restyled in stage 5א. */}
  <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
  <AppHeader variant="minimal" />
  <Box sx={{
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    position: "relative",
    px: 2,
    py: { xs: 4, md: 6 },
  }}>
    <Card sx={{
      position: "relative",
      zIndex: 2,
      maxWidth: 409,
      width: "100%",
      mx: 2,
      borderRadius: "34px",
      // Paper on the page, not glass: with the picture gone there is nothing
      // behind the card to see through (the card's own design is stage 5א).
      boxShadow: "0 22px 44px rgba(80, 54, 26, 0.15)",
      bgcolor: "background.paper",
      border: 1,
      borderColor: "divider",
      overflow: "visible",
    }}>
      <CardContent sx={{ p: 4, pt: 6, position: "relative", zIndex: 2 }}>
        <Typography variant="h4" fontWeight={400} mb={4} textAlign="center" color="#424242">
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  </Box>
  </Box>
  </ThemeProvider>
  );
};

export default AuthLayout;
