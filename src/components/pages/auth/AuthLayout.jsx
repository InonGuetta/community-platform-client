import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { AUTH, RADIUS, SHADOW, WHITE } from "../../../theme/tokens";
import AppHeader from "../../layout/navbar/AppHeader";
import { BrandWaveIcon } from "../../layout/navbar/dockIcons";

// The sign-in family of pages (design/REDESIGN_V4.md, screens 01, 30, 31): the
// minimal header — the brand and the language (decision 5) — over two soft
// washes, and a 440px glass card with the dark logo, the title and whatever the
// page puts in it. It follows the site's colour mode like every other page: the
// washes and the glass have a dark pair in AUTH.
//
// `intro` is the sentence under the title (forgot-password); without it the
// title leaves more room before the first field.
const AuthLayout = ({ title, intro, children }) => (
  <Box
    sx={(theme) => ({
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: AUTH.backdrop[theme.palette.mode],
    })}
  >
    <AppHeader variant="minimal" />
    <Box
      component="main"
      sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: { xs: 4, md: 6 },
      }}
    >
      <Box
        sx={(theme) => ({
          width: "100%",
          maxWidth: 440,
          p: { xs: 4, md: 5 },
          borderRadius: `${RADIUS.auth}px`,
          bgcolor: AUTH.card[theme.palette.mode],
          border: `1px solid ${AUTH.cardEdge[theme.palette.mode]}`,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: SHADOW.auth,
        })}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            mx: "auto",
            mb: 3,
            borderRadius: "14px",
            bgcolor: AUTH.logo,
            color: WHITE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BrandWaveIcon sx={{ fontSize: 24 }} />
        </Box>
        <Typography
          variant="display"
          component="h1"
          sx={{ fontSize: { xs: 32, md: 40 }, textAlign: "center", mb: intro ? 1.5 : 4 }}
        >
          {title}
        </Typography>
        {intro && (
          <Typography sx={{ textAlign: "center", fontSize: 15, lineHeight: 1.6, color: "text.secondary", mb: 3.5 }}>
            {intro}
          </Typography>
        )}
        {children}
      </Box>
    </Box>
  </Box>
);

export default AuthLayout;
