// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import notesReducer from "../../../store/slicesAndThunks/notesSlice/notesSlice";
import bookmarksReducer from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksSlice";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";

// Editing in the notebook — the drafts, the save, Ctrl+S and deletion — which
// the strip under a lesson does by the same rules (LessonNotebookEditing.test.jsx),
// except where this page deliberately differs: Ctrl+S is always taken here,
// and a picked card is scrolled to the top of the view.

const listNotes = vi.hoisted(() => vi.fn());
const updateNote = vi.hoisted(() => vi.fn());
const removeNote = vi.hoisted(() => vi.fn());

vi.mock("../../../api/notesApi", () => ({
  notesApi: {
    list: (...args) => listNotes(...args),
    byIds: vi.fn(async () => []),
    aboutMedia: vi.fn(),
    create: vi.fn(),
    update: (...args) => updateNote(...args),
    remove: (...args) => removeNote(...args),
    reorder: vi.fn(),
  },
}));
vi.mock("../../../api/bookmarksApi", () => ({
  bookmarksApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), remove: vi.fn() },
}));

import NotebookPage from "./NotebookPage";

const NOTES = [
  { id: 1, title: "תפילה", body: "<p>כוונה</p>", updated_at: "2026-11-01T10:00:00Z" },
  { id: 2, title: "", body: "<p>בלי שם</p>", updated_at: "2026-11-01T11:00:00Z" },
];

const renderNotebook = async () => {
  const store = configureStore({
    reducer: { notes: notesReducer, bookmarks: bookmarksReducer, notification: notificationReducer },
  });
  render(<Provider store={store}><NotebookPage /></Provider>);
  await screen.findAllByRole("textbox", { name: "גוף ההערה" });
  return store;
};

const editors = () => screen.getAllByRole("textbox", { name: "גוף ההערה" });
const saveButtons = () => screen.getAllByRole("button", { name: /^שמירה/ });
const notices = (store) => JSON.stringify(store.getState().notification);
const ctrlS = (target = window) => fireEvent.keyDown(target, { key: "s", ctrlKey: true });
const dialogClosed = () => waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  // A focused editor reads the toolbar's state off the selection; jsdom has no
  // execCommand state to read.
  document.queryCommandValue = vi.fn(() => "");
  document.queryCommandState = vi.fn(() => false);
  listNotes.mockResolvedValue(NOTES);
  updateNote.mockImplementation(async (id, { title, body }) => ({ id, title, body }));
  removeNote.mockResolvedValue(undefined);
});

describe("a draft", () => {
  test("is kept when its save fails, and dropped when one succeeds", async () => {
    await renderNotebook();
    fireEvent.input(editors()[0], { target: { innerHTML: "<p>שונה</p>" } });
    expect(saveButtons()[0]).toBeEnabled();

    updateNote.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(saveButtons()[0]);
    await waitFor(() => expect(updateNote).toHaveBeenCalledTimes(1));
    expect(saveButtons()[0]).toBeEnabled();

    fireEvent.click(saveButtons()[0]);
    await waitFor(() => expect(updateNote).toHaveBeenCalledTimes(2));
    expect(updateNote).toHaveBeenLastCalledWith(1, expect.objectContaining({ title: "תפילה", body: "<p>שונה</p>" }));
    await waitFor(() => expect(saveButtons()[0]).toBeDisabled());
  });

  test("of a card with no title asks for a name before it is saved", async () => {
    await renderNotebook();
    fireEvent.input(editors()[1], { target: { innerHTML: "<p>עדיין בלי שם</p>" } });
    fireEvent.click(saveButtons()[1]);
    expect(await screen.findByText("לא צוין שם לכרטיסייה")).toBeInTheDocument();
    expect(updateNote).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("שם הכרטיסייה"), { target: { value: "צדקה" } });
    fireEvent.click(screen.getByRole("button", { name: "שמור" }));
    await waitFor(() => expect(updateNote).toHaveBeenCalledWith(2, expect.objectContaining({ title: "צדקה" })));
  });
});

describe("Ctrl+S", () => {
  test("with no card holding the caret is still taken, and says how to save", async () => {
    const store = await renderNotebook();
    let notPrevented;
    await act(async () => { notPrevented = ctrlS(); });
    expect(notPrevented).toBe(false);
    expect(notices(store)).toContain("לא נבחרה הערה. לחץ בתוך הערה ואז שמור.");
    expect(updateNote).not.toHaveBeenCalled();
  });

  test("in a card with nothing changed says so", async () => {
    const store = await renderNotebook();
    await act(async () => { fireEvent.focus(editors()[0]); });
    await act(async () => { ctrlS(); });
    expect(notices(store)).toContain("אין שינויים לשמירה");
    expect(updateNote).not.toHaveBeenCalled();
  });

  test("in a card with a change saves that card only, and announces it", async () => {
    const store = await renderNotebook();
    fireEvent.input(editors()[1], { target: { innerHTML: "<p>לא זו</p>" } });
    await act(async () => { fireEvent.focus(editors()[0]); });
    fireEvent.input(editors()[0], { target: { innerHTML: "<p>זו</p>" } });
    await act(async () => { ctrlS(); });
    await waitFor(() => expect(updateNote).toHaveBeenCalledWith(1, expect.objectContaining({ body: "<p>זו</p>" })));
    expect(updateNote).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(notices(store)).toContain("ההערה נשמרה"));
  });

  test("inside a dialog is taken from the browser but saves nothing behind it", async () => {
    await renderNotebook();
    await act(async () => { fireEvent.focus(editors()[0]); });
    fireEvent.input(editors()[0], { target: { innerHTML: "<p>שונה</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "מחיקת ההערה תפילה" }));
    const dialog = await screen.findByRole("dialog");
    let notPrevented;
    await act(async () => { notPrevented = ctrlS(within(dialog).getByRole("button", { name: "מחיקה" })); });
    expect(notPrevented).toBe(false);
    expect(updateNote).not.toHaveBeenCalled();
  });
});

describe("deleting", () => {
  test("waits for the server: a failed delete leaves the card and its draft", async () => {
    removeNote.mockRejectedValueOnce(new Error("offline"));
    await renderNotebook();
    fireEvent.input(editors()[0], { target: { innerHTML: "<p>טיוטה</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "מחיקת ההערה תפילה" }));
    fireEvent.click(await screen.findByRole("button", { name: "מחיקה" }));
    await waitFor(() => expect(removeNote).toHaveBeenCalledWith(1));
    await dialogClosed();
    expect(editors()).toHaveLength(2);
    expect(saveButtons()[0]).toBeEnabled();
  });

  test("the ticked notes: the ones deleted go, with their ticks; the one refused stays, ticked", async () => {
    removeNote.mockImplementation(async (id) => { if (id === 2) throw new Error("refused"); });
    await renderNotebook();
    fireEvent.click(screen.getByRole("checkbox", { name: "בחירת ההערה תפילה" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "בחירת ההערה ללא כותרת" }));
    expect(screen.getByText("2 נבחרו")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "מחיקת הנבחרות" }));
    fireEvent.click(await screen.findByRole("button", { name: "מחיקה" }));
    await waitFor(() => expect(removeNote).toHaveBeenCalledTimes(2));
    await dialogClosed();
    await waitFor(() => expect(editors()).toHaveLength(1));
    expect(screen.getByText("1 נבחרו")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "בחירת ההערה ללא כותרת" })).toBeChecked();
  });
});

test("a note picked from the index is scrolled to the top of the view", async () => {
  await renderNotebook();
  fireEvent.click(screen.getAllByText("תפילה")[0]);
  await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" }));
});
