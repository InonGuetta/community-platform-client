// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NoteToolbar from "./NoteToolbar";

// The toolbar sits in the page header and the text it formats is in a box
// further down. That distance is the whole difficulty, and it comes down to one
// property: a press must not move the focus. A click that focuses the button
// collapses the selection in the editor first, and the command then applies to
// nothing — the failure looks like "the bold button does nothing", with no error
// anywhere to explain it.

const renderToolbar = (props = {}) => {
  const onCommand = vi.fn();
  const onFontSize = vi.fn();
  render(<NoteToolbar onCommand={onCommand} onFontSize={onFontSize} {...props} />);
  return Object.assign(onCommand, { onFontSize });
};

describe("keeping the selection alive", () => {
  test("a button acts on mousedown, and cancels it", () => {
    const onCommand = renderToolbar();
    const bold = screen.getByRole("button", { name: "מודגש" });

    // fireEvent reports whether anything called preventDefault: it returns false
    // when the event was cancelled. That is the assertion — not that a handler
    // ran, but that the browser was stopped from doing its default, which here
    // is moving the focus off the editor.
    expect(fireEvent.mouseDown(bold)).toBe(false);
    expect(onCommand).toHaveBeenCalledWith("bold", undefined);
  });

  test("a colour swatch cancels its press too", () => {
    const onCommand = renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "הדגשה" }));
    const yellow = screen.getByRole("button", { name: "צהוב" });

    expect(fireEvent.mouseDown(yellow)).toBe(false);
    expect(onCommand).toHaveBeenCalledWith("hiliteColor", "#fff59d");
  });

  // The size menu is the one control that opens on CLICK — a menu has to stay
  // open to be chosen from — so its rows carry the cancellation instead.
  test("a size row cancels its press too", () => {
    const onCommand = renderToolbar();

    fireEvent.click(screen.getByRole("button", { name: "גודל הטקסט" }));
    const row = screen.getByRole("menuitem", { name: /24px/ });

    expect(fireEvent.mouseDown(row)).toBe(false);
    expect(onCommand.onFontSize).toHaveBeenCalledWith(24);
  });
});

describe("the size control", () => {
  const openSizeMenu = () => fireEvent.click(screen.getByRole("button", { name: "גודל הטקסט" }));

  test("it shows the size the caret is standing in, in pixels", () => {
    renderToolbar({ formats: { fontSizePx: 28 } });
    expect(screen.getByRole("button", { name: "גודל הטקסט" })).toHaveTextContent("28px");
  });

  // Unstyled text reports nothing to read a size off. Showing an empty control
  // would say the text has no size; 16px is what the browser is in fact using.
  test("text that was never sized shows the browser's own default", () => {
    renderToolbar({ formats: {} });
    expect(screen.getByRole("button", { name: "גודל הטקסט" })).toHaveTextContent("16px");
  });

  // The point of the change: any size, not one of seven buckets.
  test("a typed size is applied on Enter", () => {
    const onCommand = renderToolbar();
    openSizeMenu();

    const field = screen.getByLabelText("גודל בפיקסלים");
    fireEvent.change(field, { target: { value: "37" } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(onCommand.onFontSize).toHaveBeenCalledWith(37);
  });

  // A field a user types into will receive nonsense sooner or later, and
  // "font-size: 4000px" is not a size, it is a broken note.
  test("a size outside the usable range is clamped rather than applied", () => {
    const onCommand = renderToolbar();
    openSizeMenu();

    const field = screen.getByLabelText("גודל בפיקסלים");
    fireEvent.change(field, { target: { value: "4000" } });
    fireEvent.click(screen.getByRole("button", { name: "החל" }));

    expect(onCommand.onFontSize).toHaveBeenCalledWith(200);
  });

  // The field is seeded from the caret, so opening the menu and pressing Enter
  // applies what was already there rather than jumping to a default.
  test("the field opens on the size the caret is already in", () => {
    renderToolbar({ formats: { fontSizePx: 22 } });
    openSizeMenu();

    expect(screen.getByLabelText("גודל בפיקסלים")).toHaveValue(22);
  });
});

describe("what the strip offers", () => {
  test("the marks are wired to the commands that produce them", () => {
    const onCommand = renderToolbar();

    for (const [label, command] of [
      ["נטוי", "italic"],
      ["קו תחתון", "underline"],
      ["קו חוצה", "strikeThrough"],
      ["רשימת תבליטים", "insertUnorderedList"],
      ["רשימה ממוספרת", "insertOrderedList"],
      ["ניקוי עיצוב", "removeFormat"],
    ]) {
      fireEvent.mouseDown(screen.getByRole("button", { name: label }));
      expect(onCommand).toHaveBeenCalledWith(command, undefined);
    }
  });

  // The state comes from the live selection, which only the editor can read —
  // so the buttons must render what they are told rather than deciding.
  test("a button shows as pressed when the caret is standing in that format", () => {
    renderToolbar({ formats: { bold: true } });

    expect(screen.getByRole("button", { name: "מודגש" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "נטוי" })).toHaveAttribute("aria-pressed", "false");
  });
});

// With no note open there is nothing to format. The strip stays in place and
// fades rather than disappearing, so the header does not change shape every time
// the user selects or deselects a note.
test("with no note open nothing can be pressed", () => {
  const onCommand = renderToolbar({ disabled: true });
  const bold = screen.getByRole("button", { name: "מודגש" });

  expect(bold).toBeDisabled();
  fireEvent.mouseDown(bold);
  expect(onCommand).not.toHaveBeenCalled();
});
