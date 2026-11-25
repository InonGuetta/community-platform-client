// The shell's measurements, in px — the one place a page reads them from.
//
// HEADER_HEIGHT is the sticky header (component 1 of design/REDESIGN_V4.md).
// A page that fills the screen below it writes `calc(100vh - ${HEADER_HEIGHT}px)`
// (viewportBelowHeader); a sticky toolbar sits at `top: HEADER_HEIGHT`. It was
// 64 and written out by hand in ten pages (D-35).
export const HEADER_HEIGHT = 48;

// The room the floating dock needs at the bottom of a page (part B, "Layout":
// bottom padding 160). PageContainer pads by it; anything else that floats at
// the bottom of the screen sits above DOCK_OFFSET (D-47).
export const DOCK_CLEARANCE = 160;

// The dock's own height plus its gap from the screen's edge, rounded up — how
// far above the bottom a toast or a floating input has to start to clear it.
export const DOCK_OFFSET = { xs: 96, md: 112 };

export const viewportBelowHeader = `calc(100vh - ${HEADER_HEIGHT}px)`;
