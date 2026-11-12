// ── What a top-bar tab looks like ───────────────────────────────────────────
//
// Split into three named pieces because the "תוכן אישי" dropdown wears all of
// them too: it hangs off the bar and has to read as a continuation of it, not as
// a generic MUI menu that happens to open underneath. Anything stated inline
// here twice would be the thing that stops matching the first time the bar is
// restyled.

// How thick the bar is, in px. Its tabs are exactly this tall — they stretch to
// the toolbar — so the dropdown's tabs take it too, and the drawer starts at it.
// The number was written out at all three, which is why the dropdown came out
// visibly thinner than the strip it is supposed to continue.
export const BAR_HEIGHT = 64;

// The tints the bar paints its own tabs with. Deliberately the same literals in
// both modes, exactly as the bar has always used them.
const NAV_HOVER = "rgba(26,74,102,0.08)";
const NAV_ACTIVE = "rgba(26,74,102,0.12)";

// The lettering: small, spaced, uppercase, in the brand navy.
export const navLabelSx = {
  color: "primary.main",
  fontWeight: 700,
  fontSize: "0.75rem",
  letterSpacing: 0.8,
  textTransform: "uppercase",
};

// The bar's surface — its gradient and the tone of its hairline edge. Used by
// the AppBar itself and by the dropdown's paper, so the two are the same
// material. The dark values are the bar's existing override, not a new choice.
//
// LONGHANDS, deliberately, and this is not a style preference. `background` and
// `border` are shorthands that RESET the properties they do not mention:
// `background: <gradient>` writes the gradient into background-image, and
// `border: 1px solid` resets border-color to currentColor. Mixed with the
// callers' own declarations that produced two silent failures — a later
// `backgroundImage: none` erased the gradient and left a white panel, and a
// later `border` shorthand repainted the hairline in the text colour. Longhands
// do not reach across into each other, so the result no longer depends on which
// key a caller happens to write second.
//
// backgroundImage is also what overrides MUI's dark-mode elevation overlay,
// which is itself a background-image — so no separate cancelling is needed.
export const barSurfaceSx = (theme) =>
  theme.palette.mode === "dark"
    ? {
        backgroundImage: "linear-gradient(135deg, #13202a 0%, #16242d 55%, #182b34 100%)",
        backgroundColor: "transparent",
        borderColor: "rgba(255,255,255,0.08)",
      }
    : {
        backgroundImage: "linear-gradient(135deg, #cce9f2 0%, #e6f5fb 55%, #f1fafc 100%)",
        backgroundColor: "transparent",
        borderColor: "rgba(26,74,102,0.10)",
      };

// A tab in the row.
export const navButtonSx = (isActive) => ({
  ...navLabelSx,
  borderRadius: 0,
  px: 2,
  bgcolor: isActive ? NAV_ACTIVE : "transparent",
  "&:hover": { bgcolor: NAV_HOVER },
});

// A tab inside the dropdown. Same lettering, same tints, same square corners as
// one in the bar — because it is meant to BE one: the panel lays them out in a
// row, so what drops down is a second line of the bar rather than a list.
//
// nowrap and the auto width are what make that work: a MenuItem is built to be a
// full-width row and will happily wrap its label, which in a horizontal strip
// reads as a broken tab rather than a narrow one.
export const navMenuItemSx = {
  ...navLabelSx,
  borderRadius: 0,
  px: 2,
  whiteSpace: "nowrap",
  width: "auto",
  flex: "0 0 auto",
  // The bar's own thickness. A MenuItem is ~48px by default, which read as a
  // thinner strip stuck under a thicker one; at the same height the two are one
  // continuous surface. `height` as well as minHeight because MUI sets its
  // default inside a media query, and a min alone leaves that free to win.
  minHeight: BAR_HEIGHT,
  height: BAR_HEIGHT,
  "&:hover": { bgcolor: NAV_HOVER },
  // MUI's own selected/hover colours are overridden rather than left to the
  // theme — otherwise the open page's tab would be highlighted in a different
  // blue from the one that leads to it.
  "&.Mui-selected": { bgcolor: NAV_ACTIVE },
  "&.Mui-selected:hover": { bgcolor: NAV_ACTIVE },
  // MenuItem carries a physical `text-align: left` from MUI, and this app runs
  // RTL without the stylis flip plugin.
  textAlign: "start",
};

// The strip itself. A MenuList stacks its children; this is the one declaration
// that turns the dropdown from a list into a row of tabs. Direction is left to
// the document's RTL, exactly as in the bar above, so the first shelf sits on
// the right under the tab that opened it.
export const navMenuListSx = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  // No band of gradient above the first tab and below the last: each one meets
  // the panel's edge, the way a tab meets the bar's.
  py: 0,
};
