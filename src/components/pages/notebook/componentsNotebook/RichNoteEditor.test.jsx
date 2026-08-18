// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RichNoteEditor from "./RichNoteEditor";
import { sourceChipHtml } from "../../../../utilities/noteSource";

// Two things in a note body that are not text, and both need a way to be
// operated on that does not involve selecting them exactly with a mouse:
//
//   * a pasted screenshot, which until now could only be removed by selecting
//     it and pressing Delete — and an image on its own line is surprisingly
//     hard to select exactly;
//   * a source chip, which is a reference to a lecture and should open it.
//
// Neither control can live inside the contentEditable: anything in there is
// part of the note, gets saved with it, and can be typed into.

const IMAGE = '<img src="data:image/png;base64,iVBORw0KGgo=" alt="">';

const setup = (html, props = {}) => {
  const onChange = vi.fn();
  const onOpenSource = vi.fn();
  const { container } = render(
    <RichNoteEditor html={html} onChange={onChange} onOpenSource={onOpenSource} {...props} />
  );
  return { container, editor: screen.getByRole("textbox"), onChange, onOpenSource };
};

describe("removing a pasted image", () => {
  test("hovering a picture offers the one control it needs", () => {
    const { editor } = setup(IMAGE);

    expect(screen.queryByLabelText("מחיקת התמונה")).not.toBeInTheDocument();
    fireEvent.mouseOver(editor.querySelector("img"));
    expect(screen.getByLabelText("מחיקת התמונה")).toBeInTheDocument();
  });

  test("pressing it takes the picture out of the note and reports the change", () => {
    const { editor, onChange } = setup(`<div>לפני</div>${IMAGE}<div>אחרי</div>`);

    fireEvent.mouseOver(editor.querySelector("img"));
    fireEvent.click(screen.getByLabelText("מחיקת התמונה"));

    expect(editor.querySelector("img")).toBe(null);
    // The page holds the draft, so a change nobody was told about is a change
    // that is not saved and cannot be saved — the button stays greyed out.
    expect(onChange).toHaveBeenCalledWith(expect.not.stringContaining("<img"));
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining("אחרי"));
    // And the control goes with the thing it acted on.
    expect(screen.queryByLabelText("מחיקת התמונה")).not.toBeInTheDocument();
  });

  test("moving off the picture puts the control away", () => {
    const { editor } = setup(`<div>טקסט</div>${IMAGE}`);

    fireEvent.mouseOver(editor.querySelector("img"));
    fireEvent.mouseOver(editor.querySelector("div"));

    expect(screen.queryByLabelText("מחיקת התמונה")).not.toBeInTheDocument();
  });

  // Typing moves everything below the caret, so a frame measured a moment ago
  // is now drawn where the picture no longer is.
  test("typing puts it away rather than leaving it floating", () => {
    const { editor } = setup(IMAGE);

    fireEvent.mouseOver(editor.querySelector("img"));
    fireEvent.input(editor);

    expect(screen.queryByLabelText("מחיקת התמונה")).not.toBeInTheDocument();
  });

  // The controls are drawn OUTSIDE the editor, which scrolls inside itself, so
  // nothing clips them: a picture scrolled past the top of the box gave a
  // negative offset and the outline was painted over the card's own title.
  //
  // jsdom lays nothing out, so the geometry is staged — which is the only way
  // to cover this at all, and the alternative is a rule nothing checks.
  describe("when the picture is scrolled out of the visible box", () => {
    const stage = (imageBox) => {
      const { editor } = setup(IMAGE);
      const image = editor.querySelector("img");
      editor.getBoundingClientRect = () => ({ top: 100, bottom: 400, height: 300, left: 0, right: 500, width: 500 });
      image.getBoundingClientRect = () => imageBox;
      return { editor, image };
    };

    test("a picture in view is framed", () => {
      const { image } = stage({ top: 150, bottom: 250, height: 100, left: 20, right: 220, width: 200 });

      fireEvent.mouseOver(image);
      expect(screen.getByLabelText("מחיקת התמונה")).toBeInTheDocument();
    });

    test("one scrolled entirely above the box is not framed at all", () => {
      const { image } = stage({ top: -60, bottom: 40, height: 100, left: 20, right: 220, width: 200 });

      fireEvent.mouseOver(image);
      expect(screen.queryByLabelText("מחיקת התמונה")).not.toBeInTheDocument();
    });

    test("one scrolled half out is framed only over the half still showing", () => {
      const { image } = stage({ top: 50, bottom: 150, height: 100, left: 20, right: 220, width: 200 });

      fireEvent.mouseOver(image);
      const button = screen.getByLabelText("מחיקת התמונה");

      // The editor's top edge is at 100 and the frame's origin is at 0, so a
      // button on the picture's own top edge would sit at 50 — half a card
      // above the box it belongs to. It is pinned to the visible edge instead.
      expect(button).toHaveStyle({ top: "100px" });
    });
  });
});

describe("a source chip in the body", () => {
  const chip = sourceChipHtml({ mediaId: 12, timestampSeconds: 742, mediaTitle: "בבא קמא ב" });

  // The same treatment a picture gets, for the same reason: a one-word chip in
  // the middle of a sentence is no easier to select exactly than an image on
  // its own line, and until now nothing could remove one.
  test("hovering it offers to remove it, and pressing that does", () => {
    const { editor, onChange } = setup(`כתוב ${chip} כאן`);

    fireEvent.mouseOver(editor.querySelector("span[data-media-id]"));
    fireEvent.click(screen.getByLabelText("מחיקת המקור"));

    expect(editor.querySelector("span[data-media-id]")).toBe(null);
    expect(onChange).toHaveBeenCalledWith(expect.not.stringContaining("data-media-id"));
    // The writing around it is not collateral.
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining("כאן"));
  });

  // The two removable objects share one frame, so moving between them has to
  // hand it over rather than leave two on screen or none.
  test("moving from a chip to a picture moves the offer with it", () => {
    const { editor } = setup(`כתוב ${chip} כאן${IMAGE}`);

    fireEvent.mouseOver(editor.querySelector("span[data-media-id]"));
    expect(screen.getByLabelText("מחיקת המקור")).toBeInTheDocument();

    fireEvent.mouseOver(editor.querySelector("img"));
    expect(screen.getByLabelText("מחיקת התמונה")).toBeInTheDocument();
    expect(screen.queryByLabelText("מחיקת המקור")).not.toBeInTheDocument();
  });

  test("clicking it opens the lecture at the second it names", () => {
    const { editor, onOpenSource } = setup(`כתוב ${chip} כאן`);

    fireEvent.click(editor.querySelector("span[data-media-id]"));

    expect(onOpenSource).toHaveBeenCalledWith({
      mediaId: 12,
      timestampSeconds: 742,
      mediaTitle: "בבא קמא ב",
      note: "",
      mediaType: null,
      noteText: "▶ בבא קמא ב · 12:22",
    });
  });

  test("clicking the writing around it does nothing of the sort", () => {
    const { editor, onOpenSource } = setup(`כתוב ${chip} כאן`);

    fireEvent.click(editor);

    expect(onOpenSource).not.toHaveBeenCalled();
  });
});
