// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import notesReducer from "../../../store/slicesAndThunks/notesSlice/notesSlice";
import bookmarksReducer from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksSlice";
import notificationReducer from "../../../store/slicesAndThunks/notificationSlice";

// The path from "I want a file" to a file, which is now three steps: the export
// button opens a menu of three, one of those opens the question about sources,
// and only the answer to that writes anything.
//
// Every part of it has been unit-tested on its own. This is the join — the one
// thing unit tests structurally cannot check — and it is where the split path
// stacks two dialogs on top of each other.
//
// Mocked at the API rather than at the thunks: the real thunks, the real
// reducers and the real selectors then run, so this exercises the page as it
// ships and not a rearrangement of it.

const listNotes = vi.hoisted(() => vi.fn());
const listBookmarks = vi.hoisted(() => vi.fn());
const writePdf = vi.hoisted(() => vi.fn());
const writeWord = vi.hoisted(() => vi.fn());
const writeNotebooks = vi.hoisted(() => vi.fn());

vi.mock("../../../api/notesApi", () => ({
  notesApi: {
    list: (...args) => listNotes(...args),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(),
  },
}));
vi.mock("../../../api/bookmarksApi", () => ({
  bookmarksApi: { list: (...args) => listBookmarks(...args), create: vi.fn(), remove: vi.fn() },
}));

// The writers themselves load jsPDF, a Hebrew font and the bidi tables, and
// hand a blob to a browser that cannot receive one here. What matters is WHICH
// of them was called, with which notes, and in which source style.
vi.mock("../../../utilities/notesExport", () => ({
  downloadNotesPdf: (...args) => writePdf(...args),
  downloadNotesWord: (...args) => writeWord(...args),
  downloadNotebooks: (...args) => writeNotebooks(...args),
}));

import NotebookPage from "./NotebookPage";

const NOTES = [
  { id: 1, title: "בדיקה 01", body: "אחת", updated_at: "2026-08-11T10:00:00Z" },
  { id: 2, title: "בדיקה 02", body: "שתיים", updated_at: "2026-08-11T11:00:00Z" },
];

const renderNotebook = async () => {
  const store = configureStore({
    reducer: { notes: notesReducer, bookmarks: bookmarksReducer, notification: notificationReducer },
  });
  render(<Provider store={store}><NotebookPage /></Provider>);
  await screen.findByText("בדיקה 01");
  return store;
};

const openExportMenu = () => fireEvent.click(screen.getByRole("button", { name: /ייצוא/ }));

beforeEach(() => {
  // The call history as well as the implementations: these spies live at module
  // scope, so without this a test asserting "nothing was written" passes or
  // fails on what the test before it did.
  vi.clearAllMocks();
  listNotes.mockResolvedValue(NOTES);
  listBookmarks.mockResolvedValue([]);
  writePdf.mockResolvedValue(undefined);
  writeWord.mockResolvedValue(undefined);
  writeNotebooks.mockResolvedValue(2);
});

describe("from the export button to a file", () => {
  // The menu is three rows and nothing else. It had grown to seven, which is
  // what moved the source question out of it.
  test("the menu offers the three exports and no settings", async () => {
    await renderNotebook();
    openExportMenu();

    expect(screen.getByRole("menuitem", { name: /ייצוא ל-PDF/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /ייצוא ל-Word/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /פיצול למספר מחברות/ })).toBeInTheDocument();
    expect(screen.queryByText("בתחתית העמוד")).not.toBeInTheDocument();
  });

  // The step that did not exist before: choosing a format writes nothing yet.
  test("choosing a format asks about the sources and writes nothing", async () => {
    await renderNotebook();
    openExportMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /ייצוא ל-PDF/ }));

    expect(await screen.findByText("איך לכלול את המקורות?")).toBeInTheDocument();
    expect(writePdf).not.toHaveBeenCalled();
  });

  test("answering it writes the file, in the style that was answered", async () => {
    await renderNotebook();
    openExportMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /ייצוא ל-PDF/ }));
    fireEvent.click(await screen.findByRole("button", { name: /מקורות בתוך הטקסט/ }));

    await waitFor(() => expect(writePdf).toHaveBeenCalled());
    const [notes, options] = writePdf.mock.calls[0];
    expect(notes.map((note) => note.id)).toEqual([1, 2]);
    expect(options).toEqual({ sources: "inline" });
    expect(writeWord).not.toHaveBeenCalled();
  });

  test("the third answer exports without sources at all", async () => {
    await renderNotebook();
    openExportMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /ייצוא ל-Word/ }));
    fireEvent.click(await screen.findByRole("button", { name: /ייצוא ללא מקורות כלל/ }));

    await waitFor(() => expect(writeWord).toHaveBeenCalled());
    expect(writeWord.mock.calls[0][1]).toEqual({ sources: "none" });
  });

  // The dialog is the only thing between a menu click and a file on someone's
  // disk, so backing out of it has to leave the disk alone.
  test("cancelling the question exports nothing", async () => {
    await renderNotebook();
    openExportMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /ייצוא ל-PDF/ }));
    fireEvent.click(await screen.findByRole("button", { name: "ביטול" }));

    await waitFor(() => expect(screen.queryByText("איך לכלול את המקורות?")).not.toBeInTheDocument());
    expect(writePdf).not.toHaveBeenCalled();
  });
});

describe("the split path, where two dialogs stack", () => {
  const openSplit = async () => {
    await renderNotebook();
    openExportMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /פיצול למספר מחברות/ }));
    return screen.findByText("פיצול הייצוא למספר מחברות");
  };

  test("arranging the notebooks and exporting asks the same question", async () => {
    await openSplit();

    fireEvent.click(screen.getByRole("button", { name: /ייצוא 1 קבצים/ }));

    expect(await screen.findByText("איך לכלול את המקורות?")).toBeInTheDocument();
    expect(writeNotebooks).not.toHaveBeenCalled();
  });

  test("answering it writes the notebooks", async () => {
    await openSplit();
    fireEvent.click(screen.getByRole("button", { name: /ייצוא 1 קבצים/ }));
    fireEvent.click(await screen.findByRole("button", { name: /מקורות בתחתית העמוד/ }));

    await waitFor(() => expect(writeNotebooks).toHaveBeenCalled());
    const [books] = writeNotebooks.mock.calls[0];
    expect(books).toHaveLength(1);
    expect(books[0].notes.map((note) => note.id)).toEqual([1, 2]);
  });

  // The plan is a piece of work in itself. Cancelling the question has to come
  // back to it rather than throw it away.
  test("cancelling the question returns to the arrangement", async () => {
    await openSplit();
    fireEvent.click(screen.getByRole("button", { name: /ייצוא 1 קבצים/ }));
    fireEvent.click(await screen.findByRole("button", { name: "ביטול" }));

    await waitFor(() => expect(screen.queryByText("איך לכלול את המקורות?")).not.toBeInTheDocument());
    expect(screen.getByText("פיצול הייצוא למספר מחברות")).toBeInTheDocument();
    expect(writeNotebooks).not.toHaveBeenCalled();
  });
});
