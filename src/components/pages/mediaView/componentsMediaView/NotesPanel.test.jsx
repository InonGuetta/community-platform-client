// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import NotesPanel from "./NotesPanel";

// The panel dispatches a delete, so it needs a store — but nothing here asserts
// on the store, and a reducer that only has to exist is cheaper and clearer than
// pulling in the real one.
const withStore = (ui) => {
  const store = configureStore({ reducer: { bookmarks: (state = { items: [] }) => state } });
  return render(<Provider store={store}>{ui}</Provider>);
};

const recording = { id: 1, timestamp_seconds: 754, char_position: null, note: "כאן" };
const passage = {
  id: 2,
  timestamp_seconds: null,
  char_position: 4200,
  char_end: 4260,
  chunk_id: 55,
  page_number: 47,
  quoted_text: "ואמר רבי יוחנן",
  note: "יסוד הסוגיה",
};
const orphan = { ...passage, id: 3, chunk_id: null, note: "מה שהיה" };
// The third kind: a place on a page of the ORIGINAL scan. It has neither a
// timestamp nor a char_position, which is exactly what makes it able to fall
// through both of the tests this panel used to make.
const onPage = {
  id: 5,
  timestamp_seconds: null,
  char_position: null,
  chunk_id: null,
  page_number: 9,
  rect_x: 0.12, rect_y: 0.4315, rect_w: 0.63, rect_h: 0.021,
  quoted_text: "בּ עֵ ת הַ הִ וא",
  note: "כאן הוא דן",
};

// ── B1 ──────────────────────────────────────────────────────────────────────
//
// The form read "הוסף הערה בזמן הנוכחי" on a book page and sent
// Math.floor(currentTime), which on a page with no player is 0 — always. Every
// press produced a bookmark at second zero of a document with no timeline.
describe("where a bookmark is made", () => {
  test("a recording offers the form, because it has a playhead to read", () => {
    withStore(<NotesPanel bookmarks={[]} onCreateBookmark={vi.fn()} />);
    expect(screen.getByLabelText("הוסף הערה בזמן הנוכחי")).toBeInTheDocument();
  });

  // A book is marked in the book — the words are selected on the page and
  // saved there. The panel says where, and offers no control of its own: the
  // draggable handle that used to sit here belonged to the extracted-text view,
  // and outlived it by exactly one commit. A control that cannot do anything is
  // worse than an instruction, because it invites the press.
  test("a book is told where the gesture is, and offered no form", () => {
    withStore(<NotesPanel bookmarks={[]} isText />);
    expect(screen.queryByLabelText("הוסף הערה בזמן הנוכחי")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "שמור" })).not.toBeInTheDocument();
    // Nothing to pick up, and nothing to press.
    expect(screen.queryByLabelText("סימנייה חדשה")).not.toBeInTheDocument();
    expect(screen.getByText(/סמנו את השורה בספר/)).toBeInTheDocument();
  });

  test("a recording is given the form instead, because it has a playhead", () => {
    withStore(<NotesPanel bookmarks={[]} onCreateBookmark={vi.fn()} />);
    expect(screen.queryByText(/סמנו את השורה בספר/)).not.toBeInTheDocument();
  });

  test("the recording's form still saves the current second with its note", () => {
    const onCreateBookmark = vi.fn();
    withStore(<NotesPanel bookmarks={[]} currentTime={91.7} onCreateBookmark={onCreateBookmark} />);
    fireEvent.change(screen.getByLabelText("הוסף הערה בזמן הנוכחי"), { target: { value: "כאן" } });
    fireEvent.click(screen.getByRole("button", { name: "שמור" }));
    expect(onCreateBookmark).toHaveBeenCalledWith(91, "כאן");
  });
});

// ── F6 ──────────────────────────────────────────────────────────────────────
describe("what a row says", () => {
  test("a passage shows its note, its words and its page", () => {
    withStore(<NotesPanel bookmarks={[passage]} isText />);
    expect(screen.getByText("יסוד הסוגיה")).toBeInTheDocument();
    expect(screen.getByText("„ואמר רבי יוחנן” · עמ׳ 47")).toBeInTheDocument();
  });

  // "(ללא הערה)" on every row is a list nobody can read, and that is what a
  // book's bookmarks looked like before a passage carried its text.
  test("a passage with no note is titled by the words that were marked", () => {
    withStore(<NotesPanel bookmarks={[{ ...passage, note: null }]} isText />);
    expect(screen.getByText("ואמר רבי יוחנן")).toBeInTheDocument();
    expect(screen.queryByText("(ללא הערה)")).not.toBeInTheDocument();
  });

  // formatTime(null) is "0:00", so every bookmark in every sefer used to be
  // labelled with a timestamp it does not have.
  test("a book's row never shows a time", () => {
    withStore(<NotesPanel bookmarks={[passage]} isText />);
    expect(screen.queryByText(/בזמן/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0:00/)).not.toBeInTheDocument();
  });

  test("a document with no pages says so plainly rather than inventing one", () => {
    withStore(<NotesPanel bookmarks={[{ ...passage, page_number: null }]} isText />);
    expect(screen.getByText(/במיקום בטקסט/)).toBeInTheDocument();
  });

  test("a recording's row reads exactly as it always did", () => {
    withStore(<NotesPanel bookmarks={[recording]} />);
    expect(screen.getByText("כאן")).toBeInTheDocument();
    expect(screen.getByText("בזמן 12:34")).toBeInTheDocument();
  });
});

// ── F5 ──────────────────────────────────────────────────────────────────────
describe("clicking a row", () => {
  test("a passage hands the whole bookmark to the reader, not a bare offset", () => {
    const onSeekText = vi.fn();
    withStore(<NotesPanel bookmarks={[passage]} isText onSeekText={onSeekText} />);
    fireEvent.click(screen.getByText("יסוד הסוגיה"));
    expect(onSeekText).toHaveBeenCalledWith(passage);
  });

  test("a recording still seeks the player by second", () => {
    const onSeek = vi.fn();
    withStore(<NotesPanel bookmarks={[recording]} onSeek={onSeek} />);
    fireEvent.click(screen.getByText("כאן"));
    expect(onSeek).toHaveBeenCalledWith(754);
  });
});

// ── Decision 5 ──────────────────────────────────────────────────────────────
describe("a bookmark whose paragraph was re-extracted away", () => {
  test("it stays listed, keeping the words it was made from", () => {
    withStore(<NotesPanel bookmarks={[orphan]} isText />);
    expect(screen.getByText("מה שהיה")).toBeInTheDocument();
  });

  test("it says its place is gone instead of citing a page it can no longer reach", () => {
    withStore(<NotesPanel bookmarks={[orphan]} isText />);
    expect(screen.getByText(/המיקום אינו זמין עוד/)).toBeInTheDocument();
    expect(screen.queryByText(/עמ׳ 47/)).not.toBeInTheDocument();
  });

  test("clicking it does nothing rather than scrolling somewhere wrong", () => {
    const onSeekText = vi.fn();
    withStore(<NotesPanel bookmarks={[orphan]} isText onSeekText={onSeekText} />);
    fireEvent.click(screen.getByText("מה שהיה"));
    expect(onSeekText).not.toHaveBeenCalled();
  });

  // aria-disabled rather than disabled, because MUI's disabled would take
  // pointer events off the whole row — including the delete button inside it.
  // A bookmark that cannot be reached and cannot be tidied away either is worse
  // than one that merely cannot be reached.
  test("it can still be deleted", () => {
    withStore(<NotesPanel bookmarks={[orphan]} isText />);
    const button = screen.getByLabelText("מחיקת סימנייה");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
  });
});

// The list is shown in the notebook's source window too, where the store holds
// every kind of bookmark at once. `null <= 0` is true, so without this guard the
// last bookmark in a sefer lit up permanently as the one being played.
describe("the active row", () => {
  // `null <= 0` is true, so a bookmark with no timestamp matched the playhead
  // and stayed lit. Written for the text kind, and a mark on a page walked
  // straight back into it — same NULL, same comparison, different kind.
  test("no bookmark in a book is ever the one being played", () => {
    const { container } = withStore(
      <NotesPanel bookmarks={[onPage, { ...onPage, id: 6, page_number: 41 }]} currentTime={0} />
    );
    expect(container.querySelectorAll(".Mui-selected")).toHaveLength(0);
  });

  test("no text bookmark is ever the one being played", () => {
    const { container } = withStore(
      <NotesPanel bookmarks={[passage, { ...passage, id: 4 }]} currentTime={0} />
    );
    expect(container.querySelectorAll(".Mui-selected")).toHaveLength(0);
  });
});

// Editing what a bookmark says.
//
// A note is the one part of a bookmark that is a first draft — written in a
// hurry, while reading. Until now the only way to correct one was to delete the
// bookmark and place it again, which throws the anchor away to fix a typo.
//
// Offered for EVERY kind: a note on a lecture and a note on a line are the same
// words, and there is no reason one should be correctable and the other not.
// A mark made in the "מקור" tab is still a place in a book, and clicking it has
// to hand the reader the whole row: the page alone says which page, and the
// rectangle is what says where on it.
describe("clicking a mark made on a page of the original", () => {
  test("hands the reader the bookmark itself, not a number of seconds", () => {
    const onSeekText = vi.fn();
    const onSeek = vi.fn();
    withStore(<NotesPanel bookmarks={[onPage]} isText onSeekText={onSeekText} onSeek={onSeek} />);

    fireEvent.click(screen.getByText("כאן הוא דן"));

    expect(onSeekText).toHaveBeenCalledWith(onPage);
    // The branch it used to take, where timestamp_seconds is null.
    expect(onSeek).not.toHaveBeenCalled();
  });

  test("and says which page it is on", () => {
    withStore(<NotesPanel bookmarks={[onPage]} isText />);
    expect(screen.getByText(/עמ׳ 9/)).toBeTruthy();
  });
});

describe("correcting a note", () => {
  const openEditor = (row) => {
    withStore(<NotesPanel bookmarks={[row]} isText={row === passage} />);
    fireEvent.click(screen.getByLabelText("עריכת ההערה"));
  };

  test("a recording's bookmark offers it", () => {
    withStore(<NotesPanel bookmarks={[recording]} />);
    expect(screen.getByLabelText("עריכת ההערה")).toBeInTheDocument();
  });

  test("so does a line's", () => {
    withStore(<NotesPanel bookmarks={[passage]} isText />);
    expect(screen.getByLabelText("עריכת ההערה")).toBeInTheDocument();
  });

  test("the field opens holding what is already there", () => {
    openEditor(recording);
    expect(screen.getByLabelText("הערה")).toHaveValue("כאן");
  });

  test("a bookmark with no note yet opens empty rather than showing the placeholder text", () => {
    withStore(<NotesPanel bookmarks={[{ ...recording, note: null }]} />);
    fireEvent.click(screen.getByLabelText("עריכת ההערה"));
    expect(screen.getByLabelText("הערה")).toHaveValue("");
  });

  test("Escape leaves the note as it was", () => {
    openEditor(recording);
    const field = screen.getByLabelText("הערה");
    fireEvent.change(field, { target: { value: "משהו אחר" } });
    fireEvent.keyDown(field, { key: "Escape" });

    expect(screen.queryByLabelText("הערה")).not.toBeInTheDocument();
    expect(screen.getByText("כאן")).toBeInTheDocument();
  });

  test("cancelling does the same", () => {
    openEditor(recording);
    fireEvent.click(screen.getByLabelText("ביטול העריכה"));
    expect(screen.getByText("כאן")).toBeInTheDocument();
  });

  // The row is itself a button that jumps to the bookmark. Pressing "edit" must
  // not also scroll the reader away from the very thing being annotated.
  test("opening the editor does not also jump to the bookmark", () => {
    const onSeekText = vi.fn();
    withStore(<NotesPanel bookmarks={[passage]} isText onSeekText={onSeekText} />);
    fireEvent.click(screen.getByLabelText("עריכת ההערה"));
    expect(onSeekText).not.toHaveBeenCalled();
  });

  test("nor does deleting", () => {
    const onSeekText = vi.fn();
    withStore(<NotesPanel bookmarks={[passage]} isText onSeekText={onSeekText} />);
    fireEvent.click(screen.getByLabelText("מחיקת סימנייה"));
    expect(onSeekText).not.toHaveBeenCalled();
  });

  // While a row is a form it must not also be a link — a click meant for the
  // text field would otherwise scroll the page out from under it.
  test("a row being edited is no longer something to click through", () => {
    openEditor(passage);
    expect(screen.queryByText("„ואמר רבי יוחנן” · עמ׳ 47")).not.toBeInTheDocument();
  });
});
