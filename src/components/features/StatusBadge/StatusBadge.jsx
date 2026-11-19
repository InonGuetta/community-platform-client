import Box from "@mui/material/Box";
import { RADIUS } from "../../../theme/tokens";

// A status pill (component 9): "פעיל", "טיוטה", a role, a tag. The tone is
// what the status means, and the colours of each tone are the theme's
// (palette.badge — tokens.js), light and dark.
export const BADGE_TONES = ["indigo", "neutral", "success", "warning", "error"];

const SIZES = {
  medium: { height: 28, paddingInline: "12px", fontSize: 12 },
  small: { height: 22, paddingInline: "8px", fontSize: 11 },
};

const StatusBadge = ({ tone = "neutral", size = "medium", icon = null, children, sx = [] }) => {
  const known = BADGE_TONES.includes(tone) ? tone : "neutral";
  return (
    <Box
      component="span"
      data-tone={known}
      sx={[
        {
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          flexShrink: 0,
          borderRadius: `${RADIUS.pill}px`,
          fontWeight: 700,
          lineHeight: 1,
          whiteSpace: "nowrap",
          bgcolor: `badge.${known}.bg`,
          color: `badge.${known}.fg`,
          "& svg": { fontSize: "1.25em" },
          ...(SIZES[size] ?? SIZES.medium),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {icon}
      {children}
    </Box>
  );
};

export default StatusBadge;
