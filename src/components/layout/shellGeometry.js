// The shell's measurements, in px — the one place a page reads them from.
//
// HEADER_HEIGHT is the sticky header (component 1 of design/REDESIGN_V4.md).
// A page that fills the screen below it writes `calc(100vh - ${HEADER_HEIGHT}px)`
// (viewportBelowHeader); a sticky toolbar sits at `top: HEADER_HEIGHT`. It was
// 64 and written out by hand in ten pages (D-35); 48 in Redesign v4, and 60
// since the owner asked for a wider bar.
export const HEADER_HEIGHT = 60;

// The room the floating dock needs at the bottom of a page (part B, "Layout":
// bottom padding 160). PageContainer pads by it; anything else that floats at
// the bottom of the screen sits above DOCK_OFFSET (D-47).
export const DOCK_CLEARANCE = 160;

// The dock's own height plus its gap from the screen's edge, rounded up — how
// far above the bottom a toast or a floating input has to start to clear it.
export const DOCK_OFFSET = { xs: 96, md: 112 };

export const viewportBelowHeader = `calc(100vh - ${HEADER_HEIGHT}px)`;

// The dock's gap from the screen's edge (Dock's own `bottom`).
export const DOCK_GAP = { xs: 12, md: 18 };

// The bottom player (D-145): one row along the foot of the screen, and the
// docked video window that stands on it from md up (below md the picture plays
// inside the row, in the cover's place).
export const NOW_PLAYING_HEIGHT = { xs: 64, md: 72 };
export const NOW_PLAYING_VIDEO = { xs: { width: 80, height: 45 }, md: { width: 320, height: 180 } };

const ZERO = { xs: 0, md: 0 };

// What the foot of the screen holds, and so where everything that floats there
// goes: the dock stands on the bar, a toast and a floating input clear both,
// and a page's bottom padding grows by the bar — and, beside a docked video,
// by as much of the window as the dock's room does not already cover.
// `type` is the media type in the bar, or null when it is closed.
export const bottomChromeFor = (type) => {
  const bar = type ? NOW_PLAYING_HEIGHT : ZERO;
  const videoRoom = type === "video" ? Math.max(0, NOW_PLAYING_VIDEO.md.height + 24 - DOCK_CLEARANCE) : 0;
  return {
    barOpen: Boolean(type),
    dockBottom: { xs: DOCK_GAP.xs + bar.xs, md: DOCK_GAP.md + bar.md },
    dockOffset: { xs: DOCK_OFFSET.xs + bar.xs, md: DOCK_OFFSET.md + bar.md },
    clearance: { xs: DOCK_CLEARANCE + bar.xs, md: DOCK_CLEARANCE + bar.md + videoRoom },
  };
};
