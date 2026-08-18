// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ExportSplitDialog from "./ExportSplitDialog";

// "Ten notes, three notebooks: these two and the last one together, those four
// separately." The dialog's whole job is to turn that sentence into a plan, and
// to hand it over without having written anything to disk — so what is asserted
// here is the plan, not the files.

const NOTES = [
  { id: 1, title: "אחת", body: "", updated_at: null },
  { id: 2, title: "שתיים", body: "", updated_at: null },
  { id: 3, title: "שלוש", body: "", updated_at: null },
];

const setup = () => {
  const onExport = vi.fn();
  const view = render(<ExportSplitDialog open notes={NOTES} onClose={vi.fn()} onExport={onExport} />);
  return Object.assign(onExport, { rerender: view.rerender });
};

// The first combobox is the number of notebooks; the rest are one per note,
// in the order the notebooks list them.
const combos = () => screen.getAllByRole("combobox");

const choose = (combo, option) => {
  fireEvent.mouseDown(combo);
  fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: option }));
};

const exportButton = () => screen.getByRole("button", { name: /ייצוא/ });

describe("dividing a selection into notebooks", () => {
  // Everything starts in one file, which is the export the user already had.
  // Anything else would be the dialog making the decision it exists to ask
  // about.
  test("it opens with the selection intact, in the order the notebook shows it", () => {
    const onExport = setup();

    fireEvent.click(exportButton());

    expect(onExport).toHaveBeenCalledWith(
      [{ name: "מחברת 1", notes: NOTES }],
      "word"
    );
  });

  test("a note moved to another notebook leaves the first and joins the second", () => {
    const onExport = setup();

    choose(combos()[2], "2");
    fireEvent.click(exportButton());

    // Note 2 is out of the first file and in the second — in neither twice, and
    // in no file never.
    expect(onExport).toHaveBeenCalledWith(
      [
        { name: "מחברת 1", notes: [NOTES[0], NOTES[2]] },
        { name: "מחברת 2", notes: [NOTES[1]] },
      ],
      "word"
    );
  });

  test("the order inside a notebook is the user's to set", () => {
    const onExport = setup();

    fireEvent.click(screen.getByRole("button", { name: "הזזת שלוש למעלה" }));
    fireEvent.click(exportButton());

    expect(onExport.mock.calls[0][0]).toEqual([{ name: "מחברת 1", notes: [NOTES[0], NOTES[2], NOTES[1]] }]);
  });

  // The name is the file name, so it is the one thing chosen here that the user
  // sees again afterwards.
  test("a notebook is exported under the name it was given", () => {
    const onExport = setup();

    // One name field per notebook; this is the first notebook's.
    fireEvent.change(screen.getAllByLabelText(/שם הקובץ/)[0], { target: { value: "רש\"י על הפרשה" } });
    fireEvent.click(exportButton());

    expect(onExport.mock.calls[0][0][0].name).toBe("רש\"י על הפרשה");
  });

  // An empty notebook is a state the user passes through on the way to filling
  // it, so it cannot be an error — it simply produces no file.
  test("an empty notebook is not exported, and the button says how many files there will be", () => {
    const onExport = setup();

    // The second notebook exists from the start and holds nothing.
    expect(exportButton()).toHaveTextContent("ייצוא 1 קבצים");

    choose(combos()[1], "2");
    expect(exportButton()).toHaveTextContent("ייצוא 2 קבצים");

    fireEvent.click(exportButton());
    expect(onExport.mock.calls[0][0].map((book) => book.name)).toEqual(["מחברת 1", "מחברת 2"]);
  });

  // Reducing the count must not lose notes: the ones in the notebooks that go
  // move into the last one that stays.
  test("removing a notebook keeps its notes", () => {
    const onExport = setup();

    choose(combos()[1], "2");
    choose(combos()[0], "1");
    fireEvent.click(exportButton());

    expect(onExport.mock.calls[0][0]).toEqual([{ name: "מחברת 1", notes: [NOTES[1], NOTES[2], NOTES[0]] }]);
  });

  // The full title, not an ellipsis. This is the one screen where the user is
  // deciding WHICH note goes where, and "עכשיו אנחנו אמורים לעשות שיהיה…" makes
  // that decision by guesswork.
  test("a note's title is shown in full", () => {
    const long = { id: 4, title: "עכשיו אנחנו אמורים לעשות שיהיה אפשר להכניס את הערכים", body: "", updated_at: null };
    render(<ExportSplitDialog open notes={[...NOTES, long]} onClose={vi.fn()} onExport={vi.fn()} />);

    const shown = screen.getByText(long.title);
    expect(shown).toBeInTheDocument();
    expect(shown).not.toHaveClass("MuiTypography-noWrap");
  });

  // The page rebuilds the array it passes in whenever anything about the
  // notebook changes — a note saved, a list refetched in the background. Keying
  // the reset on that array's identity threw away a plan the user was halfway
  // through arranging, because of an event they never caused and cannot see.
  test("a plan being arranged survives the same notes arriving in a new array", () => {
    const onExport = setup();

    choose(combos()[1], "2");
    onExport.rerender(
      <ExportSplitDialog open notes={[...NOTES]} onClose={vi.fn()} onExport={onExport} />
    );
    fireEvent.click(exportButton());

    expect(onExport.mock.calls[0][0]).toEqual([
      { name: "מחברת 1", notes: [NOTES[1], NOTES[2]] },
      { name: "מחברת 2", notes: [NOTES[0]] },
    ]);
  });

  // A genuinely different selection is a different plan, and re-seeding is the
  // right answer there.
  test("a different set of notes does start again", () => {
    const onExport = setup();

    choose(combos()[1], "2");
    onExport.rerender(
      <ExportSplitDialog open notes={NOTES.slice(0, 2)} onClose={vi.fn()} onExport={onExport} />
    );
    fireEvent.click(exportButton());

    expect(onExport.mock.calls[0][0]).toEqual([{ name: "מחברת 1", notes: [NOTES[0], NOTES[1]] }]);
  });

  // MUI draws a ToggleButtonGroup as one merged control by making the seam
  // between its children transparent — with physical left/right borders. RTL
  // mirrors the buttons but not those rules, so the transparent edge landed on
  // the OUTER side of the last one and PDF was drawn as three sides of a box.
  //
  // The structure is what is asserted, because the structure is the cause: two
  // standalone buttons each own a complete border in either direction, and
  // emotion's class-based borders are not readable from jsdom anyway.
  test("the format buttons are not grouped, so each keeps a whole border", () => {
    const { baseElement } = render(
      <ExportSplitDialog open notes={NOTES} onClose={vi.fn()} onExport={vi.fn()} />
    );

    expect(baseElement.querySelector(".MuiToggleButtonGroup-root")).toBe(null);
    expect(screen.getByRole("button", { name: "PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Word" })).toBeInTheDocument();
    // Still one choice between two, for anything reading the page aloud.
    expect(screen.getByRole("group", { name: "פורמט הייצוא" })).toBeInTheDocument();
  });

  test("the format is part of the plan", () => {
    const onExport = setup();

    fireEvent.click(screen.getByRole("button", { name: "PDF" }));
    fireEvent.click(exportButton());

    expect(onExport.mock.calls[0][1]).toBe("pdf");
  });
});

// Dragging is how anyone actually rearranges a list. The arrows and the number
// box stay because they are the same thing from a keyboard, which a drag is not
// — but they are not the way this gets used.
describe("rearranging the plan by dragging", () => {
  // The row is what carries the drag; the title is what identifies it on screen.
  const row = (title) => screen.getByText(title).closest("[draggable]");

  // jsdom measures everything as a zero-sized box at the origin, so which half
  // of a row the pointer is in has to be staged explicitly.
  const dragFromTo = (fromTitle, toTitle, place = "before") => {
    const data = new Map();
    const dataTransfer = {
      types: [],
      setData: (type, value) => { data.set(type, value); dataTransfer.types = [...data.keys()]; },
      getData: (type) => data.get(type) ?? "",
    };

    fireEvent.dragStart(row(fromTitle), { dataTransfer });

    const target = row(toTitle);
    target.getBoundingClientRect = () => ({ top: 0, height: 20, bottom: 20, left: 0, right: 0, width: 100 });
    const drop = new Event("drop", { bubbles: true });
    Object.assign(drop, { dataTransfer, clientY: place === "before" ? 2 : 18 });
    fireEvent(target, drop);
  };

  const dropOnPanel = (fromTitle, panelIndex) => {
    const data = new Map();
    const dataTransfer = {
      types: [],
      setData: (type, value) => { data.set(type, value); dataTransfer.types = [...data.keys()]; },
      getData: (type) => data.get(type) ?? "",
    };

    fireEvent.dragStart(row(fromTitle), { dataTransfer });
    fireEvent.drop(screen.getAllByLabelText(/שם הקובץ/)[panelIndex].closest(".MuiPaper-root"), { dataTransfer });
  };

  test("a note dragged above another lands there", () => {
    const onExport = setup();

    dragFromTo("שלוש", "אחת", "before");
    fireEvent.click(exportButton());

    expect(onExport.mock.calls[0][0][0].notes).toEqual([NOTES[2], NOTES[0], NOTES[1]]);
  });

  test("a note dragged below another lands after it", () => {
    const onExport = setup();

    dragFromTo("אחת", "שתיים", "after");
    fireEvent.click(exportButton());

    expect(onExport.mock.calls[0][0][0].notes).toEqual([NOTES[1], NOTES[0], NOTES[2]]);
  });

  // The thing the row targets alone could not do. An empty notebook has no rows
  // to aim at, and it is the one place a user most wants to drag INTO.
  test("a note can be dragged into an empty notebook", () => {
    const onExport = setup();

    dropOnPanel("שתיים", 1);
    fireEvent.click(exportButton());

    expect(onExport.mock.calls[0][0]).toEqual([
      { name: "מחברת 1", notes: [NOTES[0], NOTES[2]] },
      { name: "מחברת 2", notes: [NOTES[1]] },
    ]);
  });
});
