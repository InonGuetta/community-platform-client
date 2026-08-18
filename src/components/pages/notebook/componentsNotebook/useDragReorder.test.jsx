// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDragReorder, reorderIds, NOTE_DRAG_MIME } from "./useDragReorder";
import { BOOKMARK_DRAG_MIME } from "../../../../utilities/noteSource";

// Reordering the notebook by hand. The arithmetic below is the whole feature —
// everything else is the browser's own drag machinery — and it is the part that
// is invisible when it is wrong: a note dropped one place off looks like a note
// the user aimed badly at.

describe("where a dropped note lands", () => {
  const ids = [1, 2, 3, 4];

  test("dropping above a note puts it there", () => {
    expect(reorderIds(ids, 4, 2, "before")).toEqual([1, 4, 2, 3]);
  });

  test("dropping below a note puts it after it", () => {
    expect(reorderIds(ids, 1, 3, "after")).toEqual([2, 3, 1, 4]);
  });

  // The case the naive version gets wrong. Computing the destination index in
  // the ORIGINAL array leaves the dragged note still occupying a slot ahead of
  // the target, so everything below the gap lands one place short — which is
  // why the note is removed before the index is taken.
  test("a note moving down the list lands where it was aimed, not one short", () => {
    expect(reorderIds([1, 2, 3, 4], 1, 4, "after")).toEqual([2, 3, 4, 1]);
    expect(reorderIds([1, 2, 3, 4], 2, 4, "before")).toEqual([1, 3, 2, 4]);
  });

  test("the first place and the last place are both reachable", () => {
    expect(reorderIds(ids, 3, 1, "before")).toEqual([3, 1, 2, 4]);
    expect(reorderIds(ids, 3, 4, "after")).toEqual([1, 2, 4, 3]);
  });

  // Returning the SAME array is what the hook tests for before it sends a
  // request, so a click that the browser happened to read as a one-pixel drag
  // costs nothing.
  test("a move that changes nothing returns the list untouched", () => {
    expect(reorderIds(ids, 2, 2, "before")).toBe(ids);
    expect(reorderIds(ids, 2, 1, "after")).toBe(ids);
    expect(reorderIds(ids, 2, 3, "before")).toBe(ids);
    expect(reorderIds(ids, 9, 1, "before")).toBe(ids);
  });
});

// A fake drag event: the two things the handlers actually read are the payload's
// type and where in the row the pointer is.
const dragEvent = ({ id = 1, clientY = 5, top = 0, height = 20, mime = NOTE_DRAG_MIME } = {}) => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  clientY,
  currentTarget: { getBoundingClientRect: () => ({ top, height }) },
  dataTransfer: {
    types: [mime],
    getData: (type) => (type === mime ? String(id) : ""),
    setData: vi.fn(),
  },
});

describe("the drag itself", () => {
  const setup = (props = {}) => {
    const onReorder = vi.fn();
    const view = renderHook(() => useDragReorder({ ids: [1, 2, 3], onReorder, ...props }));
    return { onReorder, ...view };
  };

  test("a drop sends the new order once", () => {
    const { result, onReorder } = setup();

    act(() => result.current.itemProps(3).onDrop(dragEvent({ id: 1, clientY: 15 })));

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith([2, 3, 1]);
  });

  // Which half of the row the pointer is in is the difference between "above
  // this note" and "below" it, and it is read from the event that LANDED —
  // the marker on screen is a render behind by however far the pointer moved
  // since the last dragover.
  test("the top half drops above and the bottom half below", () => {
    const above = setup();
    act(() => above.result.current.itemProps(2).onDrop(dragEvent({ id: 3, clientY: 2, height: 20 })));
    expect(above.onReorder).toHaveBeenCalledWith([1, 3, 2]);

    const below = setup();
    act(() => below.result.current.itemProps(2).onDrop(dragEvent({ id: 1, clientY: 18, height: 20 })));
    expect(below.onReorder).toHaveBeenCalledWith([2, 1, 3]);
  });

  // A card accepts two kinds of drop and tells them apart by type alone. A
  // bookmark that reordered the notebook because it was let go over a card
  // would be a gesture doing something nobody asked for.
  test("a bookmark dropped on a note is not a reorder", () => {
    const { result, onReorder } = setup();
    const event = dragEvent({ mime: BOOKMARK_DRAG_MIME });

    act(() => result.current.itemProps(2).onDrop(event));

    expect(onReorder).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  // The list on screen is not the notebook while a search is running, so there
  // is no honest answer to where a note dropped in it belongs.
  test("nothing drags while the list is filtered", () => {
    const { result, onReorder } = setup({ disabled: true });

    expect(result.current.itemProps(1).draggable).toBe(false);
    act(() => result.current.itemProps(2).onDrop(dragEvent({ id: 1 })));
    expect(onReorder).not.toHaveBeenCalled();
  });

  // A row is a whole object, so it is simply draggable — nothing to arm and no
  // handle to press. That is what let the visible grip be removed: a CARD is a
  // page of text you select words in and could never be draggable this way.
  test("a row is draggable in its own right", () => {
    const { result } = setup();

    expect(result.current.itemProps(1).draggable).toBe(true);
    expect(result.current.itemProps(2).draggable).toBe(true);
  });

  // A drag has no keyboard equivalent, so without this the notebook cannot be
  // reordered at all by someone who does not use a mouse. It rides on the
  // index's rows, which are focusable already — there is no visible handle any
  // more for it to live on.
  test("the arrow keys move a note without a pointer", () => {
    const { result, onReorder } = setup();
    const arrow = (key) => ({ key, preventDefault: vi.fn() });

    act(() => result.current.keyProps(2).onKeyDown(arrow("ArrowUp")));
    expect(onReorder).toHaveBeenCalledWith([2, 1, 3]);

    act(() => result.current.keyProps(2).onKeyDown(arrow("ArrowDown")));
    expect(onReorder).toHaveBeenCalledWith([1, 3, 2]);
  });

  test("the page does not scroll out from under the note being moved", () => {
    const { result } = setup();
    const event = { key: "ArrowDown", preventDefault: vi.fn() };

    act(() => result.current.keyProps(1).onKeyDown(event));

    expect(event.preventDefault).toHaveBeenCalled();
  });

  test("the ends of the list are ends, and other keys are left alone", () => {
    const { result, onReorder } = setup();

    act(() => result.current.keyProps(1).onKeyDown({ key: "ArrowUp", preventDefault: vi.fn() }));
    act(() => result.current.keyProps(3).onKeyDown({ key: "ArrowDown", preventDefault: vi.fn() }));
    act(() => result.current.keyProps(2).onKeyDown({ key: "Enter", preventDefault: vi.fn() }));

    expect(onReorder).not.toHaveBeenCalled();
  });

  test("nothing moves by keyboard either while the list is filtered", () => {
    const { result, onReorder } = setup({ disabled: true });

    act(() => result.current.keyProps(2).onKeyDown({ key: "ArrowUp", preventDefault: vi.fn() }));

    expect(onReorder).not.toHaveBeenCalled();
  });

  test("the drop line is shown on the note under the pointer, never on the one in hand", () => {
    const { result } = setup();

    act(() => result.current.itemProps(1).onDragStart(dragEvent({ id: 1 })));
    act(() => result.current.itemProps(1).onDragOver(dragEvent({ clientY: 2 })));
    expect(result.current.markerFor(1)).toBe(null);

    act(() => result.current.itemProps(3).onDragOver(dragEvent({ clientY: 18, height: 20 })));
    expect(result.current.markerFor(3)).toBe("after");
    expect(result.current.isDragging(1)).toBe(true);

    // Everything the gesture was showing goes when the gesture ends, including
    // after a drag abandoned outside any target.
    act(() => result.current.itemProps(3).onDragEnd());
    expect(result.current.markerFor(3)).toBe(null);
    expect(result.current.isDragging(1)).toBe(false);
  });
});
