import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import { DOCK, MOTION } from "../../../theme/tokens";
import { DOCK_ITEMS, isActive } from "../navConfig";
import { useDockVisibility } from "./useDockVisibility";

// The dock (design/REDESIGN_V4.md, component 4): a floating glass bar at the
// bottom centre with the three places a reader goes most — the archive,
// "שאל את הארכיון", and their courses. On a desktop an icon grows under the
// pointer (or the keyboard's focus) and shows its name in a dark tip; on a
// phone the icons are smaller, each with its short name under it, and nothing
// grows. A dot marks the page you are on — and none on the course management
// page (decision 4), which isActive leaves unlit.
//
// App decides WHERE it is shown (signed in; not the sign-in pages, a guest's
// lesson or a live session — D-24). PageContainer's bottom padding is the room
// it needs.

const Dock = () => {
  const { t } = useTranslation("nav");
  const { pathname } = useLocation();
  const visible = useDockVisibility(pathname);
  return (
    <Box
      component="nav"
      aria-label={t("dock.label")}
      sx={(theme) => {
        const mode = theme.palette.mode;
        return {
          position: "fixed",
          bottom: { xs: 12, md: 18 },
          // Centred with logical insets: the dock is as wide as its icons and
          // sits between equal margins on both sides.
          insetInline: 0,
          marginInline: "auto",
          width: "max-content",
          zIndex: theme.zIndex.speedDial,
          display: "flex",
          alignItems: "flex-end",
          gap: { xs: 1, md: 1.5 },
          padding: { xs: "8px 12px", md: "10px 14px" },
          borderRadius: { xs: "24px", md: "26px" },
          bgcolor: DOCK.glass[mode],
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          border: `1px solid ${DOCK.edge[mode]}`,
          boxShadow: DOCK.shadow,
          // UI_UX_FIXES 2.2: slides down out of the way while scrolling down.
          // It stays up while focus is inside it, so a keyboard user's Tab
          // never lands on something that is off the screen.
          transform: visible ? "none" : "translateY(calc(100% + 32px))",
          transition: "transform .25s ease",
          "&:focus-within": { transform: "none" },
          "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        };
      }}
    >
      {DOCK_ITEMS.map((item) => {
        const active = isActive(item, pathname);
        const { Icon } = item;
        return (
          <Box
            key={item.id}
            component={Link}
            to={item.to}
            aria-label={t(item.labelKey)}
            aria-current={active ? "page" : undefined}
            sx={(theme) => ({
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textDecoration: "none",
              transition: `transform ${MOTION.dock}`,
              transformOrigin: "bottom center",
              outline: "none",
              borderRadius: "14px",
              [theme.breakpoints.up("md")]: {
                "&:hover, &:focus-visible": { transform: "scale(1.28) translateY(-6px)" },
                "&:hover .dock-tip, &:focus-visible .dock-tip": { opacity: 1 },
              },
              "&:active": { transform: "scale(1.1)" },
              "&:focus-visible .dock-icon": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: "3px" },
            })}
          >
            <Box
              component="span"
              className="dock-tip"
              aria-hidden
              sx={{
                display: { xs: "none", md: "block" },
                position: "absolute",
                bottom: "calc(100% + 12px)",
                bgcolor: DOCK.tip,
                color: "common.white",
                fontSize: 12,
                fontWeight: 600,
                padding: "5px 11px",
                borderRadius: "8px",
                whiteSpace: "nowrap",
                opacity: 0,
                pointerEvents: "none",
                transition: "opacity .15s",
                backdropFilter: "blur(10px)",
              }}
            >
              {t(item.labelKey)}
            </Box>
            <Box
              component="span"
              className="dock-icon"
              sx={{
                width: { xs: 50, md: 54 },
                height: { xs: 50, md: 54 },
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "common.white",
                background: item.gradient,
                boxShadow: DOCK.iconShadow,
              }}
            >
              <Icon sx={{ fontSize: 26 }} />
            </Box>
            <Box
              component="span"
              aria-hidden
              sx={{ display: { xs: "block", md: "none" }, fontSize: 10, fontWeight: 600, color: "text.primary", mt: "3px", whiteSpace: "nowrap" }}
            >
              {t(item.shortKey)}
            </Box>
            <Box
              component="span"
              aria-hidden
              data-active={active || undefined}
              sx={(theme) => ({
                width: 4,
                height: 4,
                borderRadius: "50%",
                mt: "5px",
                bgcolor: DOCK.dot[theme.palette.mode],
                opacity: active ? 1 : 0,
              })}
            />
          </Box>
        );
      })}
    </Box>
  );
};

export default Dock;
