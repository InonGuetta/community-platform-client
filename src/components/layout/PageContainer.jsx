import Box from "@mui/material/Box";
import { maxWidthOf } from "./pageWidth";
import { DOCK_CLEARANCE } from "./shellGeometry";

// The page's column (part B, "Layout"): centred, at most 1180 ("wide") or 1080
// ("narrow") wide, 16/24 at the sides, 32/48 above, and 160 below — room for the
// dock, so the last row of a page is never under it. "full" is edge to edge
// with no padding at all, for a page that lays out the whole screen itself
// (the live session room).
//
// App wraps every signed-in route in one, sized by pageWidthFor(pathname), so a
// page never wraps itself. `dockClearance={false}` drops the bottom room where
// no dock is shown.
const PageContainer = ({ width = "wide", dockClearance = true, children }) => {
  const maxWidth = maxWidthOf(width);
  if (maxWidth === null) return <Box sx={{ width: "100%" }}>{children}</Box>;
  return (
    <Box
      sx={{
        width: "100%",
        maxWidth,
        marginInline: "auto",
        paddingInline: { xs: 2, md: 3 },
        paddingTop: { xs: 4, md: 6 },
        paddingBottom: dockClearance ? `${DOCK_CLEARANCE}px` : { xs: 4, md: 6 },
        boxSizing: "border-box",
      }}
    >
      {children}
    </Box>
  );
};

export default PageContainer;
