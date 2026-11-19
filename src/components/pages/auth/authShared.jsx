import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { Link } from "react-router-dom";
import { AUTH } from "../../../theme/tokens";

// What the sign-in family of pages shares (screens 01, 30, 31). The fields and
// the buttons are the theme's own; this file holds what the pages repeat.

// The "or" between the form and the provider buttons.
export const OrDivider = ({ children }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 2, my: 3, fontSize: 13, color: "text.secondary" }}>
    <Divider sx={{ flex: 1 }} />
    {children}
    <Divider sx={{ flex: 1 }} />
  </Box>
);

// A line of small text under the form, usually holding one link.
export const AuthFootnote = ({ children, sx }) => (
  <Typography sx={{ textAlign: "center", mt: 3.5, fontSize: 14, color: "text.secondary", ...sx }}>{children}</Typography>
);

// The link in it: bold, ink — or the accent when it is the page's way out.
export const AuthLink = ({ to, accent = false, children, sx }) => (
  <Box
    component={Link}
    to={to}
    sx={{ fontWeight: 700, color: accent ? "primary.main" : "text.primary", textDecoration: "none", "&:hover": { textDecoration: "underline" }, ...sx }}
  >
    {children}
  </Box>
);

// A provider's mark in its own coloured square (the mockup's 24px square).
export const LogoSquare = ({ colour, children }) => (
  <Box
    component="span"
    aria-hidden="true"
    sx={{
      width: 24,
      height: 24,
      borderRadius: "6px",
      bgcolor: colour,
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 800,
      lineHeight: 1,
    }}
  >
    {children}
  </Box>
);

const GOOGLE_MARK = "G";
const LINKEDIN_MARK = "in";

export const GoogleIcon = () => <LogoSquare colour={AUTH.brands.google}>{GOOGLE_MARK}</LogoSquare>;

export const AppleIcon = () => (
  <LogoSquare colour={AUTH.brands.apple}>
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#fff" d="M16.37 12.6c-.02-2.3 1.88-3.4 1.97-3.46-1.07-1.57-2.74-1.78-3.33-1.8-1.42-.14-2.77.83-3.49.83-.72 0-1.83-.81-3-.79-1.55.02-2.97.9-3.77 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.88-1.28 1.24-2.52 1.26-2.59-.03-.01-2.41-.93-2.43-3.68zM14.1 5.85c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28z"/>
    </svg>
  </LogoSquare>
);

export const LinkedInIcon = () => <LogoSquare colour={AUTH.brands.linkedin}>{LINKEDIN_MARK}</LogoSquare>;

export const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

export const EyeCrossedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);
