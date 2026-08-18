import { useCallback, useState } from "react";

// Dragging notes into a new order, in the notebook's index down the side.
//
// It used to drive the column of cards as well, through a grip on each card —
// a card is a page of text you select words in, so it cannot be `draggable` in
// its own right and needed a handle to arm the gesture. The handle was removed
// at the owner's request as visual noise, and card dragging went with it: there
// is no way to drag something that cannot be made draggable without taking
// text selection away from the mouse. Rows are whole objects and have no such
// problem, so the index carries the whole feature.
//
// Native HTML5 drag and drop rather than a library. The gesture here is one
// vertical list reordering itself, which is the case the platform handles well;
// a drag-and-drop library is 30-odd kilobytes to a bundle that currently has
// none, and it would still need everything below about mime types and edit
// handles.

// The drag payload's type, and the reason a private one is used rather than
// text/plain: a contentEditable accepts text/plain natively, so dragging a note
// over another note's editor and letting go would type the note's id into
// somebody's writing. The browser has no default handling for a type it does
// not know, so a drop we do not handle does nothing at all.
export const NOTE_DRAG_MIME = "application/x-community-note";

// `types` is an array in every current browser and a DOMStringList in older
// ones, and the two do not share a membership method. Exported because the note
// card asks the same question about the OTHER payload the notebook drags — a
// bookmark — and one answer to "what is being dragged" is enough.
export const hasDragType = (dataTransfer, mime) => {
  const types = dataTransfer?.types;
  if (!types) return false;
  return typeof types.contains === "function" ? types.contains(mime) : [...types].includes(mime);
};

/**
 * `ids` with `draggedId` moved to just before or just after `targetId`.
 *
 * Removed first and then inserted, which is what makes "after the last item"
 * work: computing the destination index against the original array leaves the
 * dragged item still occupying a slot ahead of it, and everything below the
 * gap lands one place off. Returns the original array unchanged when the move
 * is a no-op, so a click that happens to be a one-pixel drag does not send a
 * request.
 */
export const reorderIds = (ids, draggedId, targetId, place) => {
  if (draggedId === targetId) return ids;

  const without = ids.filter((id) => id !== draggedId);
  const at = without.indexOf(targetId);
  if (at === -1 || without.length === ids.length) return ids;

  const to = place === "after" ? at + 1 : at;
  const next = [...without.slice(0, to), draggedId, ...without.slice(to)];
  return next.every((id, index) => id === ids[index]) ? ids : next;
};

// Which half of a row the pointer is in — the difference between dropping above
// it and below it.
const placeWithin = (event) => {
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientY < box.top + box.height / 2 ? "before" : "after";
};

/**
 * The line that shows where a drop will land, as `sx`.
 *
 * Drawn as a pseudo-element rather than as a border on the row: a border adds
 * three pixels to the element's height, so every row below the pointer would
 * shuffle down as the indicator moved between them and the list would appear to
 * squirm. This one takes up no space at all.
 */
export const dropIndicatorSx = (place) => (place ? {
  position: "relative",
  "&::after": {
    content: '""',
    position: "absolute",
    insetInlineStart: 0,
    insetInlineEnd: 0,
    [place === "before" ? "top" : "bottom"]: -2,
    height: 3,
    borderRadius: 2,
    bgcolor: "primary.main",
    pointerEvents: "none",
  },
} : null);

/**
 * @param ids       every note id, in the order they are shown.
 * @param onReorder called with the new order when a drop changes it.
 * @param disabled  when the arrangement is not the user's to change — a
 *                  filtered list is not the notebook, and dropping inside one
 *                  would mean guessing where the notes nobody can see belong.
 */
export const useDragReorder = ({ ids, onReorder, disabled = false }) => {
  const [dragId, setDragId] = useState(null);
  const [marker, setMarker] = useState(null);

  const reset = useCallback(() => {
    setDragId(null);
    setMarker(null);
  }, []);

  const itemProps = (id) => ({
    draggable: !disabled,

    onDragStart: (event) => {
      if (disabled) return;
      // Firefox starts no drag at all unless the payload is set here.
      event.dataTransfer.setData(NOTE_DRAG_MIME, String(id));
      event.dataTransfer.effectAllowed = "move";
      setDragId(id);
    },

    onDragOver: (event) => {
      if (disabled || !hasDragType(event.dataTransfer, NOTE_DRAG_MIME)) return;
      // Without this the drop is refused and the drag ends in the "flies back
      // to where it came from" animation.
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";

      const place = placeWithin(event);
      setMarker((prev) => (prev?.id === id && prev.place === place ? prev : { id, place }));
    },

    onDrop: (event) => {
      if (disabled || !hasDragType(event.dataTransfer, NOTE_DRAG_MIME)) return;
      event.preventDefault();
      event.stopPropagation();

      // Read from the payload rather than from state: the state belongs to this
      // window, and the payload is what actually crossed the drag.
      const dropped = Number(event.dataTransfer.getData(NOTE_DRAG_MIME)) || dragId;
      // The place is recomputed from the event that landed rather than read out
      // of the marker, which is a render behind by exactly the distance the
      // pointer moved between the last dragover and letting go.
      const next = reorderIds(ids, dropped, id, placeWithin(event));
      reset();
      if (next !== ids) onReorder(next);
    },

    onDragEnd: reset,
  });

  /**
   * Move one note a single place up or down. Returns whether anything moved.
   *
   * This is the same reordering the drag performs, reached without a pointer.
   * Kept here rather than in the list so that the hook stays the only thing in
   * the notebook that decides what the new order IS.
   */
  const moveBy = (id, delta) => {
    const at = ids.indexOf(id);
    const to = at + delta;
    if (disabled || at === -1 || to < 0 || to >= ids.length) return false;

    const next = [...ids];
    [next[at], next[to]] = [next[to], next[at]];
    onReorder(next);
    return true;
  };

  // Reordering WITHOUT a pointer: focus a row and press the arrow keys.
  //
  // A drag has no keyboard equivalent, so a notebook that can only be
  // rearranged by dragging cannot be rearranged at all by someone who does not
  // use a mouse. This used to live on a visible grip; the grip is gone, and the
  // rows in the notebook's index are focusable in their own right, so the
  // behaviour moved onto them and costs nothing on screen.
  const keyProps = (id) => ({
    onKeyDown: (event) => {
      const delta = { ArrowUp: -1, ArrowDown: 1 }[event.key];
      if (!delta) return;
      // The page would otherwise scroll under the note being moved.
      event.preventDefault();
      moveBy(id, delta);
    },
  });

  return {
    itemProps,
    keyProps,
    moveBy,
    isDragging: (id) => dragId === id,
    // Never on the item being dragged: a line above the note under the pointer
    // is information, a line above the note in your hand is noise.
    markerFor: (id) => (marker?.id === id && dragId !== id ? marker.place : null),
    dragging: dragId !== null,
  };
};
