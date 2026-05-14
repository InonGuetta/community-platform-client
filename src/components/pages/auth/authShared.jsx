// Shared styles
export const floatingLabelSx = {
  "& .MuiInputLabel-root": {
    color: "#3a3a3a",
    fontWeight: 700,
    transform: "translate(0, 0.35rem) scale(1)",
    transformOrigin: "top left",
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

export const googleButtonSx = {  py: 1,
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
