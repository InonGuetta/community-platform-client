// The position/size maths behind a draggable, resizable floating window.
// Pure functions, kept out of the component so the awkward cases — resizing
// from the left or top edge, a viewport smaller than the window — are testable
// rather than something you discover by dragging.

export const MIN_WIDTH = 340;
export const MIN_HEIGHT = 220;

// How much of the window must stay reachable when it is dragged towards an
// edge. A window pushed fully off screen cannot be dragged back, so it is not
// allowed to go there in the first place.
const KEEP_VISIBLE = 96;
// The header is the drag handle, so it specifically must never leave the top.
const HEADER_HEIGHT = 44;

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

// Roomy but not full-bleed on a first open, and centred: the source is a
// preview over the notebook, so the notebook should still be visible around it.
export const defaultGeometry = ({ width: vw, height: vh }) => {
  const width = clamp(Math.min(900, vw - 48), MIN_WIDTH, vw);
  const height = clamp(Math.min(700, vh - 48), MIN_HEIGHT, vh);
  return {
    x: Math.round((vw - width) / 2),
    y: Math.round((vh - height) / 2),
    width,
    height,
  };
};

export const clampToViewport = ({ x, y, width, height }, { width: vw, height: vh }) => {
  const w = clamp(width, MIN_WIDTH, Math.max(MIN_WIDTH, vw));
  const h = clamp(height, MIN_HEIGHT, Math.max(MIN_HEIGHT, vh));
  return {
    width: w,
    height: h,
    // Horizontally the window may hang off either side, as long as KEEP_VISIBLE
    // of it remains. Vertically it may not go above the top at all — that is
    // where the drag handle lives.
    x: clamp(x, KEEP_VISIBLE - w, vw - KEEP_VISIBLE),
    y: clamp(y, 0, Math.max(0, vh - HEADER_HEIGHT)),
  };
};

// `dir` is a compass string: "e", "sw", "n"… Dragging a west or north edge moves
// the window's origin as well as its size, and the two have to stop together —
// clamping the width alone lets the origin keep travelling, which drags the
// window sideways once it has hit its minimum instead of just refusing to
// shrink. Hence capping the delta rather than the result.
export const resizeBy = (start, dir, dx, dy) => {
  let { x, y, width, height } = start;

  if (dir.includes("e")) width = Math.max(MIN_WIDTH, start.width + dx);
  if (dir.includes("s")) height = Math.max(MIN_HEIGHT, start.height + dy);

  if (dir.includes("w")) {
    const applied = Math.min(dx, start.width - MIN_WIDTH);
    width = start.width - applied;
    x = start.x + applied;
  }
  if (dir.includes("n")) {
    const applied = Math.min(dy, start.height - MIN_HEIGHT);
    height = start.height - applied;
    y = start.y + applied;
  }

  return { x, y, width, height };
};

// Persisted so the size and place the user settled on is what the NEXT source
// opens at — having dragged it once, they have already said what they want.
export const readGeometry = (storageKey, viewport) => {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (raw && ["x", "y", "width", "height"].every((k) => Number.isFinite(raw[k]))) {
      // Clamped on the way out, not just on the way in: the stored geometry may
      // come from a larger screen, or a window that has since been resized.
      return clampToViewport(raw, viewport);
    }
  } catch {
    // Corrupt or unavailable storage is not worth failing over — fall through.
  }
  return defaultGeometry(viewport);
};

export const writeGeometry = (storageKey, geometry) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(geometry));
  } catch {
    // Private mode / quota. Losing the remembered size is not an error worth
    // surfacing; the window still works, it just opens centred next time.
  }
};
