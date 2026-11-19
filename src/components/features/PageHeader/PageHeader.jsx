import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// A page's header (component 13): an optional kicker in the accent, the h1 in
// display type, an optional subtitle, and the page's actions at the end,
// level with the bottom of the heading. On a phone the actions drop below.
//
// The heading sizes the design uses (part B, "טיפוגרפיה"):
export const TITLE_SIZES = {
  page: { xs: 44, md: 64 },
  archive: { xs: 44, md: 80 },
};

const PageHeader = ({ kicker, title, subtitle, actions = null, size = "page", align = "start", sx = [] }) => {
  const centred = align === "center";
  return (
    <Box
      component="header"
      sx={[
        {
          display: "flex",
          flexDirection: { xs: "column", md: centred ? "column" : "row" },
          alignItems: centred ? "center" : { xs: "stretch", md: "flex-end" },
          justifyContent: "space-between",
          gap: { xs: 2, md: 3 },
          textAlign: centred ? "center" : "start",
          mb: { xs: 4, md: 5 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box sx={{ minWidth: 0 }}>
        {kicker && (
          <Typography variant="kicker" component="p" sx={{ color: "primary.main", mb: 1.5 }}>
            {kicker}
          </Typography>
        )}
        <Typography variant="display" component="h1" sx={{ fontSize: TITLE_SIZES[size] ?? TITLE_SIZES.page, overflowWrap: "anywhere" }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography component="p" sx={{ mt: 1.5, fontSize: { xs: 17, md: 20 }, fontWeight: 500, lineHeight: 1.35, color: "text.secondary" }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", flexShrink: 0, justifyContent: centred ? "center" : "flex-start" }}>
          {actions}
        </Box>
      )}
    </Box>
  );
};

export default PageHeader;
