// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ExportSourcesDialog from "./ExportSourcesDialog";

// The last question before a document is written. It is a step of its own
// rather than another row in the export menu — the menu had grown to three
// dividers and seven rows, a wall to read through before the one thing anybody
// opened it for.

const setup = (props = {}) => {
  const onChoose = vi.fn();
  const onClose = vi.fn();
  render(<ExportSourcesDialog open onChoose={onChoose} onClose={onClose} {...props} />);
  return { onChoose, onClose };
};

const choose = (name) => fireEvent.click(screen.getByRole("button", { name: new RegExp(name) }));

describe("choosing what happens to the sources", () => {
  test("all three answers are offered", () => {
    setup();

    expect(screen.getByRole("button", { name: /מקורות בתחתית העמוד/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /מקורות בתוך הטקסט/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ייצוא ללא מקורות כלל/ })).toBeInTheDocument();
  });

  // One click answers the question AND writes the file: everything else was
  // settled before this dialog opened, so a confirm button would be a second
  // click that adds nothing.
  test("a row both answers and exports", () => {
    const { onChoose } = setup();

    choose("מקורות בתוך הטקסט");

    expect(onChoose).toHaveBeenCalledWith("inline");
  });

  test("each row sends its own answer", () => {
    const { onChoose } = setup();

    choose("מקורות בתחתית העמוד");
    choose("ייצוא ללא מקורות כלל");

    expect(onChoose.mock.calls.map(([style]) => style)).toEqual(["footnotes", "none"]);
  });

  // Cancelling must export nothing. This dialog is the only thing standing
  // between a menu click and a file on someone's disk.
  test("cancelling writes nothing", () => {
    const { onChoose, onClose } = setup();

    fireEvent.click(screen.getByRole("button", { name: "ביטול" }));

    expect(onClose).toHaveBeenCalled();
    expect(onChoose).not.toHaveBeenCalled();
  });

  // The last answer is where the question OPENS, not an answer given on the
  // user's behalf — the click is still theirs.
  test("the previous answer is shown as selected but not applied", () => {
    const { onChoose } = setup({ current: "inline" });

    expect(screen.getByRole("button", { name: /מקורות בתוך הטקסט/ })).toHaveClass("Mui-selected");
    expect(onChoose).not.toHaveBeenCalled();
  });

  // The choice is made against something concrete rather than in the abstract.
  test("it says what is about to be written", () => {
    setup({ summary: "3 הערות · PDF" });

    expect(screen.getByText("3 הערות · PDF")).toBeInTheDocument();
  });

  test("nothing can be chosen twice while a file is being written", () => {
    const { onChoose } = setup({ exporting: true });

    choose("מקורות בתחתית העמוד");

    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByText("מייצא...")).toBeInTheDocument();
  });
});
