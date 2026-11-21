import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { CARD_SHELL_SX } from "../../../theme/tokens";

// A section card (component 12): white, a 1px line, radius 24, padding 24/32,
// the card shadow, and an optional display title (24/28) with actions at its
// end. `titleComponent` keeps the page's heading outline right: a card under
// the page's h1 is an h2 unless it sits deeper.
const SectionCard = ({ title, titleComponent = "h2", actions = null, component = "section", children, sx = [] }) => (
  <Box
    component={component}
    sx={[
      {
        ...CARD_SHELL_SX,
        p: { xs: 3, md: 4 },
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {(title || actions) && (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 3 }}>
        {title && (
          <Typography variant="display" component={titleComponent} sx={{ fontSize: { xs: 24, md: 28 } }}>
            {title}
          </Typography>
        )}
        {actions && <Box sx={{ display: "flex", alignItems: "center", gap: 1, marginInlineStart: "auto" }}>{actions}</Box>}
      </Box>
    )}
    {children}
  </Box>
);

export default SectionCard;
