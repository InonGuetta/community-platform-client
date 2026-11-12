// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import notesReducer from "../../../store/slicesAndThunks/notesSlice/notesSlice";
import bookmarksReducer from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksSlice";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";

// The notebook with a LIGHT list (PRD NOTE-17): the server sends a preview and
// no body, and the page fetches bodies as it needs them. The other notebook
// tests feed notes that already have bodies; these do not.

const listNotes = vi.hoisted(() => vi.fn());
const byIds = vi.hoisted(() => vi.fn());
const updateNote = vi.hoisted(() => vi.fn());
const writePdf = vi.hoisted(() => vi.fn());

vi.mock("../../../api/notesApi", () => ({
  notesApi: {
    list: (...args) => listNotes(...args),
    byIds: (...args) => byIds(...args),
    aboutMedia: vi.fn(),
    create: vi.fn(),
    update: (...args) => updateNote(...args),
    remove: vi.fn(),
    reorder: vi.fn(),
  },
}));
vi.mock("../../../api/bookmarksApi", () => ({
  bookmarksApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), remove: vi.fn() },
}));
vi.mock("../../../utilities/notesExport", () => ({
  downloadNotesPdf: (...args) => writePdf(...args),
  downloadNotesWord: vi.fn(),
  downloadNotebooks: vi.fn(),
}));

import NotebookPage from "./NotebookPage";

const LIGHT = [
  { id: 1, title: "תפילה", preview: "הכוונה בתפילה היא עיקר", updated_at: "2026-11-01T10:00:00Z" },
  { id: 2, title: "צדקה", preview: "מעשר כספים", updated_at: "2026-11-01T11:00:00Z" },
];
const WHOLE = {
  1: { id: 1, title: "תפילה", body: "<p>הכוונה בתפילה היא עיקר, וכך כתב הרמב״ם.</p>", updated_at: "2026-11-01T10:00:00Z" },
  2: { id: 2, title: "צדקה", body: "<p>מעשר כספים</p>", updated_at: "2026-11-01T11:00:00Z" },
};

beforeEach(() => {
  vi.clearAllMocks();
  // Picking a note in the list scrolls its card into view; jsdom has no layout.
  Element.prototype.scrollIntoView = vi.fn();
  listNotes.mockImplementation(({ q } = {}) =>
    Promise.resolve(q ? LIGHT.filter((n) => n.id === 1) : LIGHT));
  byIds.mockImplementation((ids) => Promise.resolve(ids.map((id) => WHOLE[id])));
  writePdf.mockResolvedValue(undefined);
});

const renderNotebook = async () => {
  const store = configureStore({
    reducer: { notes: notesReducer, bookmarks: bookmarksReducer, notification: notificationReducer },
  });
  render(<Provider store={store}><NotebookPage /></Provider>);
  await screen.findAllByText("תפילה");
  return store;
};

describe("a light notebook", () => {
  test("the list shows the server's preview, without asking for any body to do so", async () => {
    await renderNotebook();
    expect(screen.getAllByText("הכוונה בתפילה היא עיקר").length).toBeGreaterThan(0);
    expect(listNotes).toHaveBeenCalledWith();
  });

  // jsdom has no IntersectionObserver, so a card asks for its body at once —
  // and the asks of one render go out as ONE request.
  test("cards fetch their bodies in one batch, then become editors", async () => {
    const store = await renderNotebook();
    await waitFor(() => expect(byIds).toHaveBeenCalledTimes(1));
    expect([...byIds.mock.calls[0][0]].sort()).toEqual([1, 2]);
    await waitFor(() => expect(store.getState().notes.items.every((n) => typeof n.body === "string")).toBe(true));
  });

  // A note whose body has not arrived has no draft; nothing may write one for
  // it. Ctrl+S on it is answered "nothing to save", and the server is not asked.
  test("nothing is saved for a note whose body has not arrived", async () => {
    byIds.mockImplementation(() => new Promise(() => {})); // never arrives
    const store = await renderNotebook();
    // Ctrl+S on the first note, picked from the list.
    fireEvent.click(screen.getAllByText("תפילה")[0]);
    await act(async () => {
      fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    });
    expect(updateNote).not.toHaveBeenCalled();
    expect(JSON.stringify(store.getState().notification)).toContain("אין שינויים");
  });

  // The card is the note's preview until its body arrives — not an empty editor
  // over a note that has text.
  test("until its body arrives, a card shows the preview, not an empty editor", async () => {
    byIds.mockImplementation(() => new Promise(() => {}));
    await renderNotebook();
    expect(screen.queryAllByRole("textbox", { name: /כותרת ההערה/ })).toHaveLength(0);
    expect(document.querySelectorAll('[aria-busy="true"]').length).toBe(2);
  });

  test("an export fills in the bodies it does not have before writing", async () => {
    byIds.mockImplementationOnce(() => new Promise(() => {})) // the cards' own load stalls
      .mockImplementation((ids) => Promise.resolve(ids.map((id) => WHOLE[id])));
    await renderNotebook();
    fireEvent.click(screen.getByRole("button", { name: /ייצוא/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: /ייצוא ל-PDF/ }));
    fireEvent.click(await screen.findByRole("button", { name: /מקורות בתוך הטקסט/ }));
    await waitFor(() => expect(writePdf).toHaveBeenCalled());
    const [notes] = writePdf.mock.calls[0];
    expect(notes.map((n) => n.body)).toEqual([WHOLE[1].body, WHOLE[2].body]);
  });

  // The words searched for are in the middle of note 1, past its preview.
  test("search asks the server, which reads the whole text", async () => {
    await renderNotebook();
    fireEvent.change(screen.getByPlaceholderText(/חיפוש/), { target: { value: "הרמב״ם" } });
    await waitFor(() => expect(listNotes).toHaveBeenCalledWith({ q: "הרמב״ם" }));
    await waitFor(() => expect(screen.queryAllByText("צדקה")).toHaveLength(0));
    expect(screen.getAllByText("תפילה").length).toBeGreaterThan(0);
  });
});
