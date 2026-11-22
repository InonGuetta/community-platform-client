// Shared styles
export const floatingLabelSx = {
  "& .MuiInputLabel-root": {
    color: "#3a3a3a",
    fontWeight: 700,
    transform: "translate(0, 0.35rem) scale(1)",
    // RTL: the field's inline-start is the right edge, so the label must shrink
    // toward the top-right (not the LTR default top-left) to stay anchored to
    // where the Hebrew text begins.
    transformOrigin: "top right",
    transition: "transform 220ms ease, color 220ms ease",
    fontSize: "1rem",
  },
  "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiInputLabel-shrink": {
    color: "#1e63ff",
    fontWeight: 700,
    transform: "translate(0, -0.8rem) scale(0.78)",
  },
};

export const inputBaseSx = {
  disableUnderline: true,
  sx: {
    borderBottom: "2px solid #111",
    pb: 0.5,
    color: "#333",
    fontSize: "1rem",
    "&::before, &::after": { display: "none" },
  },
};

export const submitButtonSx = {
  mt: 1,
  py: 1.5,
  borderRadius: "24px",
  fontSize: "0.95rem",
  letterSpacing: "0.5px",
  fontWeight: 500,
  color: "#2a2a2a",
  background: "linear-gradient(135deg, #ffffff 0%, #e0e0e0 25%, #bdbdbd 50%, #e8e8e8 70%, #ffffff 100%)",
  boxShadow: "0 4px 15px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.9)",
  textTransform: "none",
  "&:hover": {
    background: "linear-gradient(135deg, #f5f5f5 0%, #cccccc 25%, #a9a9a9 50%, #d4d4d4 70%, #fcfcfc 100%)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
  },
};

export const dividerSx = { flexGrow: 1, borderColor: "#111", borderBottomWidth: "1.5px" };

// Every "continue with a provider" button — Google, Apple, LinkedIn — one look.
export const socialButtonSx = {
  py: 1,
  borderRadius: "24px",
  color: "#555",
  borderColor: "#909090",
  fontWeight: 400,
  textTransform: "none",
  fontSize: "0.95rem",
  background: "transparent",
  "&:hover": {
    borderColor: "#333",
    bgcolor: "rgba(0,0,0,0.02)",
  },
};

// Shared icons
export const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#000" d="M16.37 12.6c-.02-2.3 1.88-3.4 1.97-3.46-1.07-1.57-2.74-1.78-3.33-1.8-1.42-.14-2.77.83-3.49.83-.72 0-1.83-.81-3-.79-1.55.02-2.97.9-3.77 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.88-1.28 1.24-2.52 1.26-2.59-.03-.01-2.41-.93-2.43-3.68zM14.1 5.85c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28z"/>
  </svg>
);

export const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" rx="4" fill="#0A66C2"/>
    <path fill="#fff" d="M7.1 9.4H4.6V19h2.5V9.4zM5.85 5.2a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9zM19.4 13.7c0-2.6-1.39-3.8-3.24-3.8-1.5 0-2.17.82-2.54 1.4V9.4h-2.5V19h2.5v-5.05c0-1.33.25-2.62 1.9-2.62 1.63 0 1.65 1.52 1.65 2.7V19h2.5l-.27-5.3z"/>
  </svg>
);

export const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#7a7a7a" }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

export const EyeCrossedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#7a7a7a" }}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);
