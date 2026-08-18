// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NoteCard from "./NoteCard";
import { NOTE_DRAG_MIME } from "./useDragReorder";
import { BOOKMARK_DRAG_MIME } from "../../../../utilities/noteSource";

// Two completely different things can be let go over a note card: another NOTE,
// which reorders the notebook, and a BOOKMARK, which is written into this note's
// body as a reference to a lecture.
//
// They are told apart by the type of the payload and never by where the pointer
// was, because "where" is the same place for both — the card is one target. Get
// this wrong in either direction and a gesture silently does the other thing:
// a bookmark that reorders the notebook, or a dragged note that types its own id
// into somebody's writing.

const NOTE = { id: 4, title: "בבא קמא", body: "", updated_at: "2026-08-11T10:00:00Z" };

const setup = (props = {}) => {
  const onDropSource = vi.fn();

  const { container } = render(
    <NoteCard
      note={NOTE}
      draft={{ title: NOTE.title, body: "" }}
      isDirty={false}
      isActive={false}
      onDraftChange={vi.fn()}
      onSave={vi.fn()}
      onDelete={vi.fn()}
      onOpenSource={vi.fn()}
      onDropSource={onDropSource}
      {...props}
    />
  );
  return { card: container.firstChild, onDropSource };
};

// The shape the handlers read: what type is being carried, and its payload.
const transfer = (mime, data) => ({
  types: [mime],
  getData: (type) => (type === mime ? data : ""),
  dropEffect: "",
});

// jsdom implements no DragEvent, so fireEvent.drop produces a bare Event and
// the pointer coordinates in its init are dropped on the floor — which is
// exactly the thing this card passes on. Built by hand so the coordinates are
// really there.
const dropOn = (card, mime, data, point = {}) => {
  const event = new Event("drop", { bubbles: true });
  Object.assign(event, { dataTransfer: transfer(mime, data), ...point });
  fireEvent(card, event);
};

const BOOKMARK = { mediaId: 12, timestampSeconds: 742, mediaTitle: "בבא קמא ב" };

describe("what a card accepts", () => {
  test("a dropped bookmark is handed on with the point it landed at", () => {
    const { card, onDropSource } = setup();

    dropOn(card, BOOKMARK_DRAG_MIME, JSON.stringify(BOOKMARK), { clientX: 120, clientY: 340 });

    // The point travels with it so the reference lands in the sentence it was
    // aimed at rather than at the end of the note.
    expect(onDropSource).toHaveBeenCalledWith(BOOKMARK, { x: 120, y: 340 });
  });

  // The notebook is reordered from the index down the side, not by dragging
  // cards — the grip that made a card draggable was removed as visual noise,
  // and a card with no grip is a page of text, not a handle.
  test("a dragged note does nothing to a card", () => {
    const { card, onDropSource } = setup();

    dropOn(card, NOTE_DRAG_MIME, "9");

    expect(onDropSource).not.toHaveBeenCalled();
  });

  // The only wrong answer here would be writing the raw string into the note.
  test("a payload the card cannot read inserts nothing", () => {
    const { card, onDropSource } = setup();

    expect(() => dropOn(card, BOOKMARK_DRAG_MIME, "{not json")).not.toThrow();

    expect(onDropSource).not.toHaveBeenCalled();
  });

  // A card about to be written into says so, because the notebook shows every
  // note at once and a drop with no target highlighted is a guess about which
  // of a dozen cards is under the pointer.
  test("a card says when a bookmark is hovering over it", () => {
    const { card } = setup();

    fireEvent.dragOver(card, { dataTransfer: transfer(BOOKMARK_DRAG_MIME, "") });
    expect(screen.getByText("שחרר כאן כדי לשבץ קישור לשיעור")).toBeInTheDocument();

    fireEvent.dragLeave(card, { relatedTarget: document.body });
    expect(screen.queryByText("שחרר כאן כדי לשבץ קישור לשיעור")).not.toBeInTheDocument();
  });
});

// The card carries no reordering apparatus at all any more: no grip to look
// at, and nothing that makes it draggable. Asserted rather than assumed,
// because "we deleted the icon" and "the card is inert to a note drag" are two
// different things and only the second one is the behaviour.
describe("what the card no longer has", () => {
  test("no drag handle is drawn on it", () => {
    setup();

    expect(screen.queryByTestId("DragIndicatorIcon")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/שינוי מיקום ההערה/)).not.toBeInTheDocument();
  });

  // The attribute is what would take selecting words away from the mouse.
  test("the card is never draggable, so text in it stays selectable", () => {
    const { card } = setup();

    expect(card).not.toHaveAttribute("draggable", "true");
  });
});
