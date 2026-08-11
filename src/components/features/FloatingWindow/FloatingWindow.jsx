import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Portal from "@mui/material/Portal";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CloseIcon from "@mui/icons-material/Close";
import {
  clampToViewport,
  readGeometry,
  writeGeometry,
  resizeBy,
} from "../../../utilities/floatingGeometry";

// A movable, resizable panel that floats over the page WITHOUT blocking it.
//
// Deliberately not a MUI Dialog: a Dialog is a Modal, and a Modal exists to stop
// you touching what is behind it — focus trap, backdrop, scroll lock, aria-hidden
// on the rest of the app. Here the page behind is the point. Someone previewing
// the source of a note is doing it *in order to* keep writing the note, so the
// notebook has to stay fully live underneath. Fighting a Modal's defaults into
// letting that happen ends up as more code than not using one.
//
// The trade that comes with it: no focus trap and no Escape-closes-anything from
// outside. Escape is bound on the panel itself instead, so it closes this window
// only while the focus is genuinely inside it and never while the user is typing
// in the page behind.

const viewportSize = () => ({ width: window.innerWidth, height: window.innerHeight });

// Thin strips on the edges, small squares in the corners — the same affordances
// a desktop window has. Physical left/right rather than logical inline-start:
// the app runs RTL without the stylis flip plugin, so a logical property here
// would not mean what it says.
const RESIZE_HANDLES = [
  { dir: "n", cursor: "ns-resize", sx: { top: -4, left: 10, right: 10, height: 8 } },
  { dir: "s", cursor: "ns-resize", sx: { bottom: -4, left: 10, right: 10, height: 8 } },
  { dir: "w", cursor: "ew-resize", sx: { left: -4, top: 10, bottom: 10, width: 8 } },
  { dir: "e", cursor: "ew-resize", sx: { right: -4, top: 10, bottom: 10, width: 8 } },
  { dir: "nw", cursor: "nwse-resize", sx: { top: -4, left: -4, width: 16, height: 16 } },
  { dir: "ne", cursor: "nesw-resize", sx: { top: -4, right: -4, width: 16, height: 16 } },
  { dir: "sw", cursor: "nesw-resize", sx: { bottom: -4, left: -4, width: 16, height: 16 } },
  { dir: "se", cursor: "nwse-resize", sx: { bottom: -4, right: -4, width: 16, height: 16 } },
];

const FloatingWindow = ({ open, onClose, title, storageKey, actions, children }) => {
  // Read once, lazily: the stored geometry is the size and place the user
  // dragged this to last time, which is the whole point of persisting it.
  const [geometry, setGeometry] = useState(() => readGeometry(storageKey, viewportSize()));

  // True while a drag or resize is in flight. Drives the transparent shield
  // below — without it the pointer crossing the video player or the document
  // iframe hands the events to that element and the gesture dies mid-drag.
  const [gesturing, setGesturing] = useState(false);

  // The listeners are registered once per gesture and close over their starting
  // values, so they cannot read `geometry` from a later render. This mirror is
  // what pointerup saves.
  const geometryRef = useRef(geometry);
  useEffect(() => { geometryRef.current = geometry; }, [geometry]);

  const beginGesture = useCallback((mode) => (event) => {
    // Left button only, and never from something the user meant to click.
    if (event.button !== 0) return;
    if (mode === "move" && event.target.closest("[data-no-drag]")) return;
    event.preventDefault();

    const origin = { x: event.clientX, y: event.clientY };
    const start = geometryRef.current;
    setGesturing(true);

    const handleMove = (moveEvent) => {
      const dx = moveEvent.clientX - origin.x;
      const dy = moveEvent.clientY - origin.y;
      const next = mode === "move"
        ? { ...start, x: start.x + dx, y: start.y + dy }
        : resizeBy(start, mode, dx, dy);
      setGeometry(clampToViewport(next, viewportSize()));
    };

    // Saved on release rather than on every move: this writes to localStorage,
    // and a drag produces hundreds of positions of which only the last matters.
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setGesturing(false);
      writeGeometry(storageKey, geometryRef.current);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }, [storageKey]);

  // A window remembered from a wider screen, or one left near an edge before the
  // browser was resized, would otherwise sit unreachable off the side.
  useEffect(() => {
    if (!open) return;
    const handleResize = () => setGeometry((g) => clampToViewport(g, viewportSize()));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  // Re-clamp on open too: the stored value was last checked against whatever
  // viewport it was saved in, which may not be this one.
  useEffect(() => {
    if (open) setGeometry((g) => clampToViewport(g, viewportSize()));
  }, [open]);

  if (!open) return null;

  return (
    <Portal>
      {/* Only present during a gesture, and only to catch pointer events that
          would otherwise be eaten by an iframe or the video element. */}
      {gesturing && (
        <Box sx={{ position: "fixed", inset: 0, zIndex: (t) => t.zIndex.modal + 1, cursor: "grabbing" }} />
      )}

      <Paper
        elevation={12}
        tabIndex={-1}
        role="dialog"
        aria-modal="false"
        onKeyDown={(e) => { if (e.key === "Escape") onClose?.(); }}
        sx={{
          position: "fixed",
          left: geometry.x,
          top: geometry.y,
          width: geometry.width,
          height: geometry.height,
          zIndex: (t) => t.zIndex.modal,
          borderRadius: 3,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* Header — the drag handle. */}
        <Box
          onPointerDown={beginGesture("move")}
          sx={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
            px: 2, py: 1, flexShrink: 0,
            // The pointing hand while hovering, and the closed fist only once a
            // drag is actually underway. `grab` (the open hand) reads as "this
            // is scenery you may shove around"; the hand says "this bar is
            // something you act on", which is what it is — it carries the
            // arrows, the title and the close button.
            cursor: gesturing ? "grabbing" : "pointer",
            bgcolor: "action.hover",
            borderBottom: "1px solid",
            borderColor: "divider",
            // A drag that happens to cross text should not select it.
            userSelect: "none",
          }}
        >
          {/* flex: 1 so a title that wants to centre something between its own
              controls has the whole bar to centre it in — the close button is
              the only thing pinned. */}
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 0.5 }}>
            {title}
          </Box>
          {/* Filled red, and set apart from whatever the title put next to it.
              Closing is the one control in this bar that throws work away, and
              it sits inches from the navigation arrows — so it is deliberately
              the one thing here that looks like nothing else, rather than
              another grey icon in a row of grey icons. */}
          <Tooltip title="סגירת החלון (הכרטיסיות נשמרות)">
            <IconButton
              data-no-drag
              size="small"
              onClick={onClose}
              aria-label="סגירת החלון"
              sx={{
                flexShrink: 0,
                // Its own space: a mis-click happens when the target is flush
                // against its neighbour.
                ml: 1.5,
                bgcolor: "error.main",
                color: "error.contrastText",
                boxShadow: 2,
                // Held back at 0.7 and coming fully forward under the cursor.
                // The point is not decoration: the button announces itself
                // BEFORE the click lands, so a pointer that arrived here by
                // accident is visibly warned while there is still time to move
                // away. Same treatment on keyboard focus, which is the same
                // moment for anyone not using a mouse.
                opacity: 0.7,
                transition: "opacity 120ms ease, background-color 120ms ease",
                "&:hover, &:focus-visible": { opacity: 1, bgcolor: "error.dark" },
                "&:focus-visible": { outline: "2px solid", outlineColor: "error.dark", outlineOffset: 2 },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 2 }}>{children}</Box>

        {actions && (
          <Box
            sx={{
              display: "flex", justifyContent: "flex-end", gap: 1,
              px: 2, py: 1.5, flexShrink: 0,
              borderTop: "1px solid", borderColor: "divider",
            }}
          >
            {actions}
          </Box>
        )}

        {RESIZE_HANDLES.map(({ dir, cursor, sx }) => (
          <Box
            key={dir}
            onPointerDown={beginGesture(dir)}
            sx={{ position: "absolute", zIndex: 1, cursor, ...sx }}
          />
        ))}
      </Paper>
    </Portal>
  );
};

export default FloatingWindow;
