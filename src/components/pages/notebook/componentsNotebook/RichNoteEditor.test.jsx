// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { createRef } from "react";
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
      // No bookmark behind it, so no id: a chip that is only a copy.
      bookmarkId: null,
      timestampSeconds: 742,
      // Null for a recording, which has no paragraph and no page — and null
      // rather than absent, so a chip written before books were bookmarkable
      // reads the same as one pointing at a lecture today.
      chunkId: null,
      pageNumber: null,
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

// A chip's name cannot be typed over — the chip is contenteditable="false" — so
// it is renamed from a control beside it, like the X that removes it.
describe("renaming a source chip", () => {
  const chip = sourceChipHtml({ mediaId: 49, pageNumber: 14, mediaTitle: "תורה תמימה", note: "הפנייה כללית" });

  const rename = (editor, value) => {
    fireEvent.mouseOver(editor.querySelector("span[data-media-id]"));
    fireEvent.click(screen.getByLabelText("שינוי שם ההפניה"));
    const field = screen.getByLabelText("שם ההפניה");
    expect(field).toHaveValue("הפנייה כללית");
    fireEvent.change(field, { target: { value } });
  };

  test("saving writes the new name into the note, keeping where it points", () => {
    const { editor, onChange } = setup(`<p>טקסט</p><p>${chip}</p>`);
    rename(editor, "פירוש רש״י");
    fireEvent.click(screen.getByRole("button", { name: "שמירה" }));

    const saved = onChange.mock.calls.at(-1)[0];
    expect(saved).toContain('data-note="פירוש רש״י"');
    expect(saved).toContain('data-page="14"');
    expect(saved).not.toContain("הפנייה כללית");
  });

  test("Enter saves too", () => {
    const { editor, onChange } = setup(`<p>${chip}</p>`);
    rename(editor, "מקור");
    fireEvent.keyDown(screen.getByLabelText("שם ההפניה"), { key: "Enter" });
    expect(onChange.mock.calls.at(-1)[0]).toContain('data-note="מקור"');
  });

  test("cancelling leaves the chip as it was", () => {
    const { editor } = setup(`<p>${chip}</p>`);
    rename(editor, "לא יישמר");
    fireEvent.click(screen.getByRole("button", { name: "ביטול" }));
    expect(editor.querySelector("span[data-media-id]").getAttribute("data-note")).toBe("הפנייה כללית");
  });

  // Both controls on the chip's right-hand corner, the pencil just inside the
  // X — not on opposite corners, where the pencil sat at first.
  test("the rename and delete buttons sit side by side on the right", () => {
    const { editor } = setup(`<p>${chip}</p>`);
    const element = editor.querySelector("span[data-media-id]");
    element.getBoundingClientRect = () => ({ top: 50, bottom: 80, height: 30, left: 100, right: 180, width: 80 });
    fireEvent.mouseOver(element);

    const left = (label) => parseFloat(getComputedStyle(screen.getByLabelText(label)).left);
    expect(left("מחיקת המקור")).toBe(180);
    expect(left("שינוי שם ההפניה")).toBe(160);
  });

  test("a picture is not offered a name", () => {
    const { editor } = setup(IMAGE);
    fireEvent.mouseOver(editor.querySelector("img"));
    expect(screen.queryByLabelText("שינוי שם ההפניה")).not.toBeInTheDocument();
  });
});

// Where a dragged bookmark lands. On a line of writing: in the sentence, where
// the pointer let go. Anywhere blank — an empty note, an empty line, the empty
// stretch under the last line — on the references line at the foot of the note.
describe("dropping a bookmark into a note", () => {
  const BOOKMARK = { mediaId: 12, timestampSeconds: 742, mediaTitle: "בבא קמא ב", note: "כאן" };

  const setupWithHandle = (html) => {
    const handle = createRef();
    const onChange = vi.fn();
    render(<RichNoteEditor ref={handle} html={html} onChange={onChange} />);
    return { handle, onChange, editor: screen.getByRole("textbox") };
  };

  // jsdom has no layout, so the browser's "which caret is under this point" and
  // the line's box are both supplied by the test, and insertHTML is observed
  // rather than performed.
  const pointAt = (node, offset, box) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    document.caretRangeFromPoint = () => range;
    if (box) node.parentElement.getBoundingClientRect = () => box;
  };

  let execCommand;
  beforeEach(() => {
    execCommand = vi.fn();
    document.execCommand = execCommand;
  });
  afterEach(() => {
    delete document.caretRangeFromPoint;
  });

  test("into an empty note: to the foot, with a line above it to write on", () => {
    const { handle, editor, onChange } = setupWithHandle("");
    handle.current.insertSource(BOOKMARK, { x: 100, y: 20 });

    expect(execCommand).not.toHaveBeenCalledWith("insertHTML", expect.anything(), expect.anything());
    const line = editor.querySelector('p[data-references="true"]');
    expect(line.querySelector("span[data-media-id]").getAttribute("data-media-id")).toBe("12");
    expect(editor.lastElementChild).toBe(line);
    expect(editor.firstElementChild).not.toBe(line);
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('data-references="true"'));
  });

  test("onto a line of writing: into the sentence, where the pointer let go", () => {
    const { handle, editor } = setupWithHandle("<p>שורה של טקסט</p>");
    const text = editor.querySelector("p").firstChild;
    pointAt(text, 4, { top: 0, bottom: 30, height: 30 });

    handle.current.insertSource(BOOKMARK, { x: 100, y: 20 });

    expect(execCommand).toHaveBeenCalledWith("insertHTML", false, expect.stringContaining('data-media-id="12"'));
    expect(editor.querySelector('p[data-references]')).toBe(null);
  });

  test("into the empty stretch below the writing: to the foot, not onto the last line", () => {
    const { handle, editor } = setupWithHandle("<p>שורה של טקסט</p>");
    const text = editor.querySelector("p").firstChild;
    // The browser answers a point below the text with the end of the last line.
    pointAt(text, text.length, { top: 0, bottom: 30, height: 30 });

    handle.current.insertSource(BOOKMARK, { x: 100, y: 200 });

    expect(execCommand).not.toHaveBeenCalledWith("insertHTML", expect.anything(), expect.anything());
    expect(editor.lastElementChild.matches('p[data-references="true"]')).toBe(true);
    expect(editor.firstElementChild.textContent).toBe("שורה של טקסט");
  });

  test("onto an empty line between paragraphs: to the foot", () => {
    const { handle, editor } = setupWithHandle("<p>א</p><p><br></p><p>ב</p>");
    const empty = editor.children[1];
    const range = document.createRange();
    range.setStart(empty, 0);
    document.caretRangeFromPoint = () => range;

    handle.current.insertSource(BOOKMARK, { x: 100, y: 40 });

    expect(execCommand).not.toHaveBeenCalledWith("insertHTML", expect.anything(), expect.anything());
    expect(editor.lastElementChild.matches('p[data-references="true"]')).toBe(true);
  });

  test("a second blank drop joins the references already there", () => {
    const { handle, editor } = setupWithHandle("");
    handle.current.insertSource(BOOKMARK, { x: 1, y: 1 });
    handle.current.insertSource({ ...BOOKMARK, mediaId: 13 }, { x: 1, y: 1 });

    const lines = editor.querySelectorAll('p[data-references="true"]');
    expect(lines).toHaveLength(1);
    expect([...lines[0].querySelectorAll("span[data-media-id]")].map((c) => c.getAttribute("data-media-id")))
      .toEqual(["12", "13"]);
  });
});

// A chip that is a bookmark is renamed by renaming the bookmark — the note
// itself is not edited, so it is not marked as changed.
describe("renaming a chip that is a bookmark", () => {
  const linked = sourceChipHtml({
    mediaId: 49, timestampSeconds: 60, mediaTitle: "שיחה", note: "הפנייה כללית", bookmarkId: 77,
  });

  test("renames the bookmark, shows the new name, and leaves the note unchanged", () => {
    const onRenameSource = vi.fn();
    const { editor, onChange } = setup(`<p>${linked}</p>`, { onRenameSource });
    fireEvent.mouseOver(editor.querySelector("span[data-media-id]"));
    fireEvent.click(screen.getByLabelText("שינוי שם ההפניה"));
    fireEvent.change(screen.getByLabelText("שם ההפניה"), { target: { value: "  פתיחה  " } });
    fireEvent.click(screen.getByRole("button", { name: "שמירה" }));

    expect(onRenameSource).toHaveBeenCalledWith(77, "פתיחה");
    expect(editor.querySelector("span[data-media-id]").getAttribute("data-note")).toBe("פתיחה");
    expect(onChange).not.toHaveBeenCalled();
  });

  test("with nobody to tell, it is renamed in the note like any chip", () => {
    const { editor, onChange } = setup(`<p>${linked}</p>`);
    fireEvent.mouseOver(editor.querySelector("span[data-media-id]"));
    fireEvent.click(screen.getByLabelText("שינוי שם ההפניה"));
    fireEvent.change(screen.getByLabelText("שם ההפניה"), { target: { value: "פתיחה" } });
    fireEvent.click(screen.getByRole("button", { name: "שמירה" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('data-note="פתיחה"'));
  });
});
